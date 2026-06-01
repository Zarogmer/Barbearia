import "server-only";

import { withTenant } from "@/lib/db";

export type PaymentMethod = "CASH" | "PIX" | "CREDIT" | "DEBIT" | "CORTESIA";

export type MiscRevenueRow = {
  id: string;
  name: string;
  amountCents: number;
  occurredAt: Date;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdAt: Date;
};

export type MiscRevenuesSummary = {
  items: MiscRevenueRow[];
  totalCents: number;
  byMethod: Array<{ method: PaymentMethod | "—"; amountCents: number; count: number }>;
};

export type CreateMiscRevenueInput = {
  name: string;
  amountCents: number;
  occurredAt: Date;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
};

export type UpdateMiscRevenueInput = CreateMiscRevenueInput & { id: string };

export async function listMiscRevenues(
  organizationId: string,
  opts: { start?: Date; end?: Date } = {},
): Promise<MiscRevenuesSummary> {
  return withTenant(organizationId, async (db) => {
    const items = await db.miscRevenue.findMany({
      where: {
        ...(opts.start || opts.end
          ? {
              occurredAt: {
                ...(opts.start ? { gte: opts.start } : {}),
                ...(opts.end ? { lt: opts.end } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });

    let totalCents = 0;
    const methodMap = new Map<string, { amountCents: number; count: number }>();
    for (const r of items) {
      totalCents += r.amountCents;
      const m = r.paymentMethod ?? "—";
      const cur = methodMap.get(m) ?? { amountCents: 0, count: 0 };
      cur.amountCents += r.amountCents;
      cur.count += 1;
      methodMap.set(m, cur);
    }

    return {
      items: items.map((r) => ({
        id: r.id,
        name: r.name,
        amountCents: r.amountCents,
        occurredAt: r.occurredAt,
        paymentMethod: r.paymentMethod,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
      totalCents,
      byMethod: Array.from(methodMap.entries())
        .map(([method, v]) => ({ method: method as PaymentMethod | "—", ...v }))
        .sort((a, b) => b.amountCents - a.amountCents),
    };
  });
}

export async function createMiscRevenue(
  organizationId: string,
  input: CreateMiscRevenueInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.miscRevenue.create({
      data: {
        organizationId,
        name: input.name,
        amountCents: input.amountCents,
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? null,
      },
      select: { id: true },
    });
  });
}

export async function updateMiscRevenue(
  organizationId: string,
  input: UpdateMiscRevenueInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.miscRevenue.update({
      where: { id: input.id },
      data: {
        name: input.name,
        amountCents: input.amountCents,
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? null,
      },
    });
  });
}

export async function deleteMiscRevenue(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.miscRevenue.delete({ where: { id } });
  });
}
