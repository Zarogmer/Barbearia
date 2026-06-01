"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/lib/server/expenses";
import {
  expenseFormDataToInput,
  expenseSchema,
} from "@/lib/validators/expense";

import type { ExpenseFormState, ExpenseResult } from "./state";

async function requireOwner(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Apenas OWNER gerencia despesas." };
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

export async function saveExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = expenseSchema.safeParse(expenseFormDataToInput(formData));
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const date = new Date(`${parsed.data.expenseDate}T00:00:00Z`);
  try {
    if (parsed.data.id) {
      await updateExpense(ctx.orgId, {
        id: parsed.data.id,
        name: parsed.data.name,
        amountCents: parsed.data.amountCents,
        expenseDate: date,
        category: parsed.data.category ?? null,
        notes: parsed.data.notes ?? null,
        paid: parsed.data.paid,
      });
      revalidatePath("/admin/despesas");
      return { ok: true, id: parsed.data.id };
    }
    const r = await createExpense(ctx.orgId, {
      name: parsed.data.name,
      amountCents: parsed.data.amountCents,
      expenseDate: date,
      category: parsed.data.category ?? null,
      notes: parsed.data.notes ?? null,
      paid: parsed.data.paid,
    });
    revalidatePath("/admin/despesas");
    return { ok: true, id: r.id };
  } catch (e) {
    console.error("saveExpense failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function deleteExpenseAction(id: string): Promise<ExpenseResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deleteExpense(ctx.orgId, id);
    revalidatePath("/admin/despesas");
    return { ok: true };
  } catch (e) {
    console.error("deleteExpense failed:", e);
    return { error: "Não foi possível remover." };
  }
}
