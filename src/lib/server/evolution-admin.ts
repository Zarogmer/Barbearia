import "server-only";

import { isEvolutionConfigured, loadEvolutionEnv } from "@zarogmer/env";
import { EvolutionApiError, EvolutionClient } from "@zarogmer/whatsapp";

import { prismaAdmin } from "@/lib/db";

import type { EvolutionResult } from "./whatsapp-api";

/**
 * Operações administrativas na Evolution API (multi-tenant - PBI-51), sobre
 * @zarogmer/whatsapp.
 *
 * Nome da instância = slug da org com prefixo `lustro-` (slug é @unique e
 * estável em produção — PBI-49). Na criação, registra o webhook de entrada
 * (MESSAGES_UPSERT) pra o bot de auto-resposta funcionar.
 */

const INSTANCE_PREFIX = "lustro";

export function buildInstanceName(orgSlug: string): string {
  return `${INSTANCE_PREFIX}-${orgSlug}`;
}

/** URL pública onde a Evolution entrega os webhooks desta instância. */
function webhookConfig(publicBaseUrl: string | null): { url: string } | undefined {
  const base =
    publicBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? null;
  return base ? { url: `${base}/api/whatsapp/webhook` } : undefined;
}

function errorMessage(e: unknown): string {
  if (e instanceof EvolutionApiError) return e.message;
  return e instanceof Error ? e.message : "erro desconhecido";
}

type CreateInstanceData = {
  instanceName: string;
  alreadyExists: boolean;
};

export async function createInstanceForOrg(
  organizationId: string,
): Promise<EvolutionResult<CreateInstanceData>> {
  if (!isEvolutionConfigured()) return { ok: false, reason: "NOT_CONFIGURED" };
  const env = loadEvolutionEnv();
  const client = new EvolutionClient({ baseUrl: env.baseUrl, apiKey: env.apiKey });

  const org = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true, evolutionInstance: true },
  });
  if (!org) {
    return { ok: false, reason: "API_ERROR", message: "Organização não encontrada." };
  }

  // Já tem instância: idempotente. Reaplica o webhook (instâncias criadas
  // antes deste código nunca receberam MESSAGES_UPSERT) e devolve.
  if (org.evolutionInstance) {
    const webhook = webhookConfig(env.publicBaseUrl);
    if (webhook) {
      await client.setWebhook(org.evolutionInstance, webhook).catch(() => undefined);
    }
    return {
      ok: true,
      data: { instanceName: org.evolutionInstance, alreadyExists: true },
    };
  }

  const instanceName = buildInstanceName(org.slug);
  let alreadyExists = false;
  try {
    const res = await client.createInstance(instanceName, webhookConfig(env.publicBaseUrl));
    alreadyExists = res.alreadyExists;
  } catch (e) {
    return {
      ok: false,
      reason: "API_ERROR",
      message: `Evolution falhou ao criar instância: ${errorMessage(e)}`,
    };
  }

  // Persiste no DB. Unique constraint impede 2 orgs na mesma instância.
  try {
    await prismaAdmin.organization.update({
      where: { id: organizationId },
      data: { evolutionInstance: instanceName },
    });
  } catch (e) {
    console.error("Falha ao persistir evolutionInstance:", e);
    return {
      ok: false,
      reason: "API_ERROR",
      message: "Falha ao salvar instância. Tente de novo.",
    };
  }

  return { ok: true, data: { instanceName, alreadyExists } };
}

export async function deleteInstanceForOrg(
  organizationId: string,
): Promise<EvolutionResult<true>> {
  if (!isEvolutionConfigured()) return { ok: false, reason: "NOT_CONFIGURED" };
  const env = loadEvolutionEnv();
  const client = new EvolutionClient({ baseUrl: env.baseUrl, apiKey: env.apiKey });

  const org = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { evolutionInstance: true },
  });
  if (!org?.evolutionInstance) {
    return { ok: true, data: true }; // já não tinha — no-op
  }

  // Best-effort no provider (pode estar offline); limpa o DB de qualquer forma.
  await client.deleteInstance(org.evolutionInstance).catch(() => undefined);

  await prismaAdmin.organization.update({
    where: { id: organizationId },
    data: { evolutionInstance: null },
  });

  return { ok: true, data: true };
}
