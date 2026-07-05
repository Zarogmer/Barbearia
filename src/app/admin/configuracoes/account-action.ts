"use server";

import { auth } from "@/lib/auth";
import { exportOrganizationData } from "@/lib/server/account";

// PBI-55 (revisao 2026-07-05): exclusao de conta virou responsabilidade
// SÓ do super-admin (/superadmin/lojas). Dono nao pede mais self-service —
// se quiser sair, contata suporte. LGPD art. 18 continua atendido:
// portabilidade (export abaixo) e cancelamento via canal humano.
//
// Funcoes server em src/lib/server/account.ts (scheduleAccountDeletion,
// cancelAccountDeletion) continuam existindo — sao usadas pelo super-admin
// via /superadmin/lojas/actions.ts.

export type ExportDataResult =
  | { ok: true; json: string; filename: string }
  | { ok: false; error: string };

export async function exportMyDataAction(): Promise<ExportDataResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Apenas OWNER pode exportar." };

  const data = await exportOrganizationData(owner.organizationId);
  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `lustro-export-${date}.json`;
  return { ok: true, json, filename };
}
