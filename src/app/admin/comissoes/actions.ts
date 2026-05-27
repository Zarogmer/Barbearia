"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  deleteCommissionRule,
  payCommission,
  upsertCommissionRule,
} from "@/lib/server/commissions";
import {
  payCommissionSchema,
  upsertCommissionRuleSchema,
} from "@/lib/validators/commission";

import type { CommissionActionState, CommissionResult } from "./state";

async function requireOwnerOrg(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Você precisa ser OWNER para gerenciar comissões." };
  return { orgId: owner.organizationId };
}

function collectFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString();
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function upsertRuleAction(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = upsertCommissionRuleSchema.safeParse({
    professionalId: formData.get("professionalId"),
    serviceId: formData.get("serviceId"),
    percent: formData.get("percent"),
  });
  if (!parsed.success) {
    return { error: "Confira os campos.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    await upsertCommissionRule(ctx.orgId, parsed.data);
  } catch (e) {
    console.error("upsertRule failed:", e);
    return { error: "Não foi possível salvar a regra." };
  }

  revalidatePath("/admin/comissoes");
  return { ok: true };
}

export async function deleteRuleAction(ruleId: string): Promise<CommissionResult> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deleteCommissionRule(ctx.orgId, ruleId);
  } catch (e) {
    console.error("deleteRule failed:", e);
    return { error: "Não foi possível remover." };
  }

  revalidatePath("/admin/comissoes");
  return { ok: true };
}

export async function payCommissionAction(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = payCommissionSchema.safeParse({
    professionalId: formData.get("professionalId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Confira os campos.", fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  try {
    await payCommission(ctx.orgId, parsed.data);
  } catch (e) {
    console.error("payCommission failed:", e);
    return { error: "Não foi possível registrar pagamento." };
  }

  revalidatePath("/admin/comissoes");
  return { ok: true };
}
