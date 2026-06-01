"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createWaitlistEntry,
  deleteWaitlistEntry,
  updateWaitlistStatus,
  type WaitlistStatus,
} from "@/lib/server/waitlist";
import {
  waitlistFormDataToInput,
  waitlistSchema,
} from "@/lib/validators/waitlist";

import type { WaitlistFormState, WaitlistResult } from "./state";

async function requireAdminOrg(): Promise<
  { orgId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const m = session.user.memberships[0];
  if (!m) return { error: "Sem organização." };
  return { orgId: m.organizationId };
}

function collectFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString();
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function addWaitlistAction(
  _prev: WaitlistFormState,
  formData: FormData,
): Promise<WaitlistFormState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = waitlistSchema.safeParse(waitlistFormDataToInput(formData));
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    const r = await createWaitlistEntry(ctx.orgId, {
      customerUserId: parsed.data.customerUserId ?? null,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone ?? null,
      serviceId: parsed.data.serviceId,
      professionalId: parsed.data.professionalId ?? null,
      preferredDateStart: new Date(`${parsed.data.preferredDateStart}T00:00:00Z`),
      preferredDateEnd: new Date(`${parsed.data.preferredDateEnd}T00:00:00Z`),
      notes: parsed.data.notes ?? null,
    });
    revalidatePath("/admin/lista-espera");
    return { ok: true, id: r.id };
  } catch (e) {
    console.error("addWaitlist failed:", e);
    return { error: "Não foi possível adicionar." };
  }
}

export async function deleteWaitlistAction(id: string): Promise<WaitlistResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deleteWaitlistEntry(ctx.orgId, id);
    revalidatePath("/admin/lista-espera");
    return { ok: true };
  } catch (e) {
    console.error("deleteWaitlist failed:", e);
    return { error: "Não foi possível remover." };
  }
}

export async function updateWaitlistStatusAction(
  id: string,
  status: WaitlistStatus,
): Promise<WaitlistResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await updateWaitlistStatus(ctx.orgId, id, status);
    revalidatePath("/admin/lista-espera");
    return { ok: true };
  } catch (e) {
    console.error("updateWaitlistStatus failed:", e);
    return { error: "Não foi possível atualizar." };
  }
}
