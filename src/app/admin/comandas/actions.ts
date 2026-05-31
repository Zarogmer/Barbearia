"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  ComandaError,
  addItem,
  addPayment,
  applyDiscount,
  cancelComanda,
  closeComanda,
  openComanda,
  removeItem,
  removePayment,
} from "@/lib/server/comandas";
import {
  addItemFormDataToInput,
  addItemSchema,
  addPaymentFormDataToInput,
  addPaymentSchema,
  applyDiscountSchema,
  openComandaFormDataToInput,
  openComandaSchema,
} from "@/lib/validators/comanda";

import type { ComandaActionState, ComandaResult } from "./state";

async function requireAdminOrg(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const m = session.user.memberships[0];
  if (!m) return { error: "Você não pertence a nenhuma organização." };
  return { orgId: m.organizationId };
}

function collectFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString();
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function openComandaAction(
  _prev: ComandaActionState,
  formData: FormData,
): Promise<ComandaActionState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = openComandaSchema.safeParse(openComandaFormDataToInput(formData));
  if (!parsed.success) {
    return { error: "Confira os campos.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  let id: string;
  try {
    const r = await openComanda(ctx.orgId, parsed.data);
    id = r.id;
  } catch (e) {
    console.error("openComanda failed:", e);
    return { error: "Não foi possível abrir a comanda." };
  }

  revalidatePath("/admin/comandas");
  // Retorna ok + id pro client navegar (server redirect dentro de dialog
  // pode falhar silenciosamente quando o form vem de useActionState).
  return { ok: true, comandaId: id };
}

export async function addItemAction(
  comandaId: string,
  _prev: ComandaActionState,
  formData: FormData,
): Promise<ComandaActionState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = addItemSchema.safeParse(addItemFormDataToInput(formData));
  if (!parsed.success) {
    return { error: "Confira os campos.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    await addItem(ctx.orgId, comandaId, parsed.data);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("addItem failed:", e);
    return { error: "Não foi possível adicionar o item." };
  }

  revalidatePath(`/admin/comandas/${comandaId}`);
  return { ok: true };
}

export async function removeItemAction(
  comandaId: string,
  itemId: string,
): Promise<ComandaResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await removeItem(ctx.orgId, comandaId, itemId);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("removeItem failed:", e);
    return { error: "Não foi possível remover." };
  }
  revalidatePath(`/admin/comandas/${comandaId}`);
  return { ok: true };
}

export async function applyDiscountAction(
  comandaId: string,
  _prev: ComandaActionState,
  formData: FormData,
): Promise<ComandaActionState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const reais = Number(formData.get("discountReais")) || 0;
  const parsed = applyDiscountSchema.safeParse({
    discountCents: Math.round(reais * 100),
  });
  if (!parsed.success) {
    return { error: "Confira os campos.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    await applyDiscount(ctx.orgId, comandaId, parsed.data);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("applyDiscount failed:", e);
    return { error: "Não foi possível aplicar desconto." };
  }
  revalidatePath(`/admin/comandas/${comandaId}`);
  return { ok: true };
}

export async function addPaymentAction(
  comandaId: string,
  _prev: ComandaActionState,
  formData: FormData,
): Promise<ComandaActionState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = addPaymentSchema.safeParse(addPaymentFormDataToInput(formData));
  if (!parsed.success) {
    return { error: "Confira os campos.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    await addPayment(ctx.orgId, comandaId, parsed.data);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("addPayment failed:", e);
    return { error: "Não foi possível registrar pagamento." };
  }
  revalidatePath(`/admin/comandas/${comandaId}`);
  return { ok: true };
}

export async function removePaymentAction(
  comandaId: string,
  paymentId: string,
): Promise<ComandaResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await removePayment(ctx.orgId, comandaId, paymentId);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("removePayment failed:", e);
    return { error: "Não foi possível remover." };
  }
  revalidatePath(`/admin/comandas/${comandaId}`);
  return { ok: true };
}

export async function closeComandaAction(comandaId: string): Promise<ComandaResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await closeComanda(ctx.orgId, comandaId);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("closeComanda failed:", e);
    return { error: "Não foi possível fechar." };
  }
  revalidatePath(`/admin/comandas/${comandaId}`);
  revalidatePath(`/admin/comandas`);
  return { ok: true };
}

export async function cancelComandaAction(comandaId: string): Promise<ComandaResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await cancelComanda(ctx.orgId, comandaId);
  } catch (e) {
    if (e instanceof ComandaError) return { error: e.message };
    console.error("cancelComanda failed:", e);
    return { error: "Não foi possível cancelar." };
  }
  revalidatePath(`/admin/comandas/${comandaId}`);
  revalidatePath(`/admin/comandas`);
  return { ok: true };
}
