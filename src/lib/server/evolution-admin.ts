import "server-only";

import { prismaAdmin } from "@/lib/db";

import {
  getEvolutionBaseConfig,
  type EvolutionResult,
} from "./whatsapp-api";

/**
 * Operações administrativas na Evolution API (multi-tenant - PBI-51).
 *
 * - createInstanceForOrg: cria nova instância e grava em Organization.evolutionInstance
 * - deleteInstance: remove instância no provider (irreversível)
 *
 * Nome da instância vem do slug da org com prefixo `lustro-` pra evitar
 * colisão entre clientes diferentes da mesma Evolution. Slug nunca muda
 * em produção (PBI-49 trava unique), então a instância é estável.
 */

const INSTANCE_PREFIX = "lustro";

export function buildInstanceName(orgSlug: string): string {
  return `${INSTANCE_PREFIX}-${orgSlug}`;
}

type CreateInstanceData = {
  instanceName: string;
  alreadyExists: boolean;
};

export async function createInstanceForOrg(
  organizationId: string,
): Promise<EvolutionResult<CreateInstanceData>> {
  const cfg = getEvolutionBaseConfig();
  if (!cfg) return { ok: false, reason: "NOT_CONFIGURED" };

  const org = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true, evolutionInstance: true },
  });
  if (!org) {
    return { ok: false, reason: "API_ERROR", message: "Organização não encontrada." };
  }

  // Se já tem instância, devolve a existente (idempotente).
  if (org.evolutionInstance) {
    return {
      ok: true,
      data: { instanceName: org.evolutionInstance, alreadyExists: true },
    };
  }

  const instanceName = buildInstanceName(org.slug);

  // POST /instance/create. Body conforme docs Evolution v2.
  const res = await fetch(`${cfg.url}/instance/create`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
    cache: "no-store",
  });

  // 201 cria nova, 403/409 pode ser "ja existe" (Evolution varia). Em
  // ambos os casos seguimos: salvamos o nome no DB pra fluxo proceder.
  if (!res.ok && res.status !== 403 && res.status !== 409) {
    const text = await res.text();
    return {
      ok: false,
      reason: "API_ERROR",
      status: res.status,
      message: `Evolution falhou ao criar instância: ${text.slice(0, 200)}`,
    };
  }

  // Persiste no DB. Unique constraint impede 2 orgs com mesma instance.
  // Se Evolution disse "ja existe" mas DB nao tem registro, ainda assim
  // gravamos — caso típico de retry após falha parcial.
  try {
    await prismaAdmin.organization.update({
      where: { id: organizationId },
      data: { evolutionInstance: instanceName },
    });
  } catch (e) {
    // Unique violation: outro tenant pegou esse nome (improvavel — slug
    // é unique). Vale logar pra investigar.
    console.error("Falha ao persistir evolutionInstance:", e);
    return {
      ok: false,
      reason: "API_ERROR",
      message: "Falha ao salvar instância. Tente de novo.",
    };
  }

  return {
    ok: true,
    data: { instanceName, alreadyExists: res.status === 403 || res.status === 409 },
  };
}

export async function deleteInstanceForOrg(
  organizationId: string,
): Promise<EvolutionResult<true>> {
  const cfg = getEvolutionBaseConfig();
  if (!cfg) return { ok: false, reason: "NOT_CONFIGURED" };

  const org = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { evolutionInstance: true },
  });
  if (!org?.evolutionInstance) {
    return { ok: true, data: true }; // já não tinha — no-op
  }

  // Tenta deletar no provider. Ignora falha (pode estar offline) e
  // limpa o DB de qualquer forma — admin sempre poderá criar de novo.
  try {
    await fetch(`${cfg.url}/instance/delete/${org.evolutionInstance}`, {
      method: "DELETE",
      headers: { apikey: cfg.key },
      cache: "no-store",
    });
  } catch {
    // segue
  }

  await prismaAdmin.organization.update({
    where: { id: organizationId },
    data: { evolutionInstance: null },
  });

  return { ok: true, data: true };
}
