"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  checkWhatsAppNumber,
  getConnectionStatus,
  getQrCode,
  listMessages,
  logoutInstance,
  restartInstance,
  type ConnectionStatus,
  type MessageRow,
  type NumberCheck,
  type QrCode,
} from "@/lib/server/whatsapp-api";
import { getWhatsAppProvider } from "@/lib/server/whatsapp";

async function requireOwner(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Apenas OWNER." };
  return { ok: true };
}

type ActionResult<T = void> =
  | { ok: true; data: T extends void ? undefined : T }
  | { ok: false; error: string };

export async function getConnectionStatusAction(): Promise<
  ActionResult<ConnectionStatus | null>
> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const r = await getConnectionStatus();
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: true, data: null };
    }
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function getQrCodeAction(): Promise<ActionResult<QrCode | null>> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const r = await getQrCode();
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: true, data: null };
    }
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function restartInstanceAction(): Promise<ActionResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const r = await restartInstance();
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  revalidatePath("/admin/whatsapp");
  return { ok: true, data: undefined };
}

export async function logoutInstanceAction(): Promise<ActionResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const r = await logoutInstance();
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  revalidatePath("/admin/whatsapp");
  return { ok: true, data: undefined };
}

export async function listMessagesAction(
  remoteJid: string,
): Promise<ActionResult<MessageRow[]>> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const r = await listMessages(remoteJid, 60);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") return { ok: true, data: [] };
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function checkNumberAction(
  phone: string,
): Promise<ActionResult<NumberCheck>> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  const r = await checkWhatsAppNumber(phone);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function sendMessageAction(
  phone: string,
  text: string,
): Promise<ActionResult> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!phone.trim()) return { ok: false, error: "Telefone obrigatório." };
  if (!text.trim()) return { ok: false, error: "Mensagem vazia." };
  try {
    await getWhatsAppProvider().send(phone, text);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao enviar.",
    };
  }
}
