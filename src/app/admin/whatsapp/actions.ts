"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { createInstanceForOrg, deleteInstanceForOrg } from "@/lib/server/evolution-admin";
import {
  checkWhatsAppNumber,
  getConnectionStatus,
  getQrCode,
  listChats,
  listMessages,
  logoutInstance,
  restartInstance,
  sendTextToJid,
  type ConnectionStatus,
  type MessageRow,
  type NumberCheck,
  type QrCode,
} from "@/lib/server/whatsapp-api";
import { replyChatSchema } from "@/lib/validators/whatsapp-chat";

type OwnerContext =
  | { ok: true; organizationId: string; instance: string | null }
  | { ok: false; error: string };

/**
 * Garante OWNER e devolve a instância da org logada. instance=null quando
 * a org ainda não conectou — actions checam e devolvem erro amigavel.
 */
async function requireOwnerContext(): Promise<OwnerContext> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Apenas OWNER." };

  const org = await prismaAdmin.organization.findUnique({
    where: { id: owner.organizationId },
    select: { evolutionInstance: true },
  });
  return {
    ok: true,
    organizationId: owner.organizationId,
    instance: org?.evolutionInstance ?? null,
  };
}

type ActionResult<T = void> =
  | { ok: true; data: T extends void ? undefined : T }
  | { ok: false; error: string };

export async function createOrgInstanceAction(): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const r = await createInstanceForOrg(ctx.organizationId);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  revalidatePath("/admin/whatsapp");
  return { ok: true, data: undefined };
}

export async function deleteOrgInstanceAction(): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const r = await deleteInstanceForOrg(ctx.organizationId);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  revalidatePath("/admin/whatsapp");
  return { ok: true, data: undefined };
}

export async function getConnectionStatusAction(): Promise<ActionResult<ConnectionStatus | null>> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) return { ok: true, data: null };
  const r = await getConnectionStatus(ctx.instance);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") return { ok: true, data: null };
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function getQrCodeAction(): Promise<ActionResult<QrCode | null>> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) return { ok: true, data: null };
  const r = await getQrCode(ctx.instance);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") return { ok: true, data: null };
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function restartInstanceAction(): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) {
    return { ok: false, error: "Sem instância ativa pra reiniciar." };
  }
  const r = await restartInstance(ctx.instance);
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
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) {
    return { ok: false, error: "Sem instância ativa pra desconectar." };
  }
  const r = await logoutInstance(ctx.instance);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  revalidatePath("/admin/whatsapp");
  return { ok: true, data: undefined };
}

/** Preview de conversa já serializado pra client component (datas em ISO). */
export type ChatPreviewDto = {
  remoteJid: string;
  phone: string;
  name: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isLid: boolean;
};

export async function listChatsAction(): Promise<ActionResult<ChatPreviewDto[]>> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) return { ok: true, data: [] };
  const r = await listChats(ctx.instance, 60);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") return { ok: true, data: [] };
    return { ok: false, error: r.message };
  }
  return {
    ok: true,
    data: r.data.map((c) => ({
      remoteJid: c.remoteJid,
      phone: c.phone,
      name: c.name,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      lastMessagePreview: c.lastMessagePreview,
      unreadCount: c.unreadCount,
      isLid: c.isLid,
    })),
  };
}

/**
 * Responde uma conversa aberta usando o JID como destino. Necessário pra
 * conversas @lid, cujo "telefone" aparente não existe no WhatsApp.
 */
export async function replyChatAction(input: unknown): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) return { ok: false, error: "WhatsApp não conectado." };
  const parsed = replyChatSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos pra responder a conversa." };
  }
  const r = await sendTextToJid(ctx.instance, parsed.data.remoteJid, parsed.data.text);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  return { ok: true, data: undefined };
}

export async function listMessagesAction(remoteJid: string): Promise<ActionResult<MessageRow[]>> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) return { ok: true, data: [] };
  const r = await listMessages(ctx.instance, remoteJid, 60);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") return { ok: true, data: [] };
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function checkNumberAction(phone: string): Promise<ActionResult<NumberCheck>> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) {
    return { ok: false, error: "WhatsApp não conectado." };
  }
  const r = await checkWhatsAppNumber(ctx.instance, phone);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  return { ok: true, data: r.data };
}

export async function sendMessageAction(phone: string, text: string): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!ctx.instance) {
    return { ok: false, error: "WhatsApp não conectado." };
  }
  if (!phone.trim()) return { ok: false, error: "Telefone obrigatório." };
  if (!text.trim()) return { ok: false, error: "Mensagem vazia." };

  // Resolve o JID canônico antes de enviar: conta BR registrada sem o
  // nono dígito faz o envio pro número digitado falhar com exists=false.
  const check = await checkWhatsAppNumber(ctx.instance, phone);
  if (!check.ok) {
    if (check.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: check.message };
  }
  if (!check.data.hasWhatsApp || !check.data.jid) {
    return {
      ok: false,
      error: `+${check.data.phone} não tem WhatsApp. Confira o DDD e o nono dígito.`,
    };
  }
  const r = await sendTextToJid(ctx.instance, check.data.jid, text);
  if (!r.ok) {
    if (r.reason === "NOT_CONFIGURED") {
      return { ok: false, error: "Evolution não configurada." };
    }
    return { ok: false, error: r.message };
  }
  return { ok: true, data: undefined };
}
