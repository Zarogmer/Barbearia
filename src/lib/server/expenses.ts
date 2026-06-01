import "server-only";

import { withTenant } from "@/lib/db";

export type ExpenseRow = {
  id: string;
  name: string;
  amountCents: number;
  expenseDate: Date;
  category: string | null;
  notes: string | null;
  paid: boolean;
  createdAt: Date;
};

export type ExpensesSummary = {
  items: ExpenseRow[];
  totalCents: number;
  paidCents: number;
  unpaidCents: number;
  byCategory: Array<{ category: string; amountCents: number; count: number }>;
};

export type CreateExpenseInput = {
  name: string;
  amountCents: number;
  expenseDate: Date;
  category?: string | null;
  notes?: string | null;
  paid?: boolean;
};

export type UpdateExpenseInput = CreateExpenseInput & { id: string };

/**
 * Lista despesas com filtro opcional de range. Agrega total + breakdown
 * por categoria pra UI mostrar resumo sem segunda query.
 */
export async function listExpenses(
  organizationId: string,
  opts: { start?: Date; end?: Date } = {},
): Promise<ExpensesSummary> {
  return withTenant(organizationId, async (db) => {
    const items = await db.expense.findMany({
      where: {
        ...(opts.start || opts.end
          ? {
              expenseDate: {
                ...(opts.start ? { gte: opts.start } : {}),
                ...(opts.end ? { lt: opts.end } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    });

    let totalCents = 0;
    let paidCents = 0;
    let unpaidCents = 0;
    const catMap = new Map<string, { amountCents: number; count: number }>();
    for (const e of items) {
      totalCents += e.amountCents;
      if (e.paid) paidCents += e.amountCents;
      else unpaidCents += e.amountCents;
      const cat = e.category?.trim() || "Sem categoria";
      const cur = catMap.get(cat) ?? { amountCents: 0, count: 0 };
      cur.amountCents += e.amountCents;
      cur.count += 1;
      catMap.set(cat, cur);
    }

    return {
      items: items.map((e) => ({
        id: e.id,
        name: e.name,
        amountCents: e.amountCents,
        expenseDate: e.expenseDate,
        category: e.category,
        notes: e.notes,
        paid: e.paid,
        createdAt: e.createdAt,
      })),
      totalCents,
      paidCents,
      unpaidCents,
      byCategory: Array.from(catMap.entries())
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.amountCents - a.amountCents),
    };
  });
}

export async function createExpense(
  organizationId: string,
  input: CreateExpenseInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.expense.create({
      data: {
        organizationId,
        name: input.name,
        amountCents: input.amountCents,
        expenseDate: input.expenseDate,
        category: input.category ?? null,
        notes: input.notes ?? null,
        paid: input.paid ?? true,
      },
      select: { id: true },
    });
  });
}

export async function updateExpense(
  organizationId: string,
  input: UpdateExpenseInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.expense.update({
      where: { id: input.id },
      data: {
        name: input.name,
        amountCents: input.amountCents,
        expenseDate: input.expenseDate,
        category: input.category ?? null,
        notes: input.notes ?? null,
        paid: input.paid ?? true,
      },
    });
  });
}

export async function deleteExpense(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.expense.delete({ where: { id } });
  });
}
