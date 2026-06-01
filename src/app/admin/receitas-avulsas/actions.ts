"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createMiscRevenue,
  deleteMiscRevenue,
  updateMiscRevenue,
} from "@/lib/server/misc-revenues";
import {
  miscRevenueFormDataToInput,
  miscRevenueSchema,
} from "@/lib/validators/misc-revenue";

import type { MiscRevenueFormState, MiscRevenueResult } from "./state";

async function requireOwner(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Apenas OWNER." };
  return { orgId: owner.organizationId };
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

export async function saveMiscRevenueAction(
  _prev: MiscRevenueFormState,
  formData: FormData,
): Promise<MiscRevenueFormState> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = miscRevenueSchema.safeParse(
    miscRevenueFormDataToInput(formData),
  );
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const date = new Date(`${parsed.data.occurredAt}T00:00:00Z`);
  try {
    if (parsed.data.id) {
      await updateMiscRevenue(ctx.orgId, {
        id: parsed.data.id,
        name: parsed.data.name,
        amountCents: parsed.data.amountCents,
        occurredAt: date,
        paymentMethod: parsed.data.paymentMethod ?? null,
        notes: parsed.data.notes ?? null,
      });
      revalidatePath("/admin/receitas-avulsas");
      return { ok: true, id: parsed.data.id };
    }
    const r = await createMiscRevenue(ctx.orgId, {
      name: parsed.data.name,
      amountCents: parsed.data.amountCents,
      occurredAt: date,
      paymentMethod: parsed.data.paymentMethod ?? null,
      notes: parsed.data.notes ?? null,
    });
    revalidatePath("/admin/receitas-avulsas");
    return { ok: true, id: r.id };
  } catch (e) {
    console.error("saveMiscRevenue failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function deleteMiscRevenueAction(
  id: string,
): Promise<MiscRevenueResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deleteMiscRevenue(ctx.orgId, id);
    revalidatePath("/admin/receitas-avulsas");
    return { ok: true };
  } catch (e) {
    console.error("deleteMiscRevenue failed:", e);
    return { error: "Não foi possível remover." };
  }
}
