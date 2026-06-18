"use server";

import { revalidatePath } from "next/cache";

import { auth, signOut } from "@/lib/auth";
import {
  cancelAccountDeletion,
  exportOrganizationData,
  scheduleAccountDeletion,
} from "@/lib/server/account";

export type DeleteAccountResult =
  | { ok: true; scheduledFor: string }
  | { ok: false; error: string };

export async function requestAccountDeletionAction(): Promise<DeleteAccountResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sessão expirada." };
  }
  const r = await scheduleAccountDeletion(session.user.id);
  if (!r.ok) return r;
  // Forçar logout — usuário não consegue mais entrar até cancelar.
  await signOut({ redirectTo: "/" });
  return { ok: true, scheduledFor: r.scheduledFor.toISOString() };
}

export async function cancelAccountDeletionAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sessão expirada." };
  }
  await cancelAccountDeletion(session.user.id);
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

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
