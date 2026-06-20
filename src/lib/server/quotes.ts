import "server-only";

import { withTenant } from "@/lib/db";

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED";
export type QuoteItemType = "SERVICE" | "PRODUCT" | "MANUAL";

export type QuoteItemRow = {
  id: string;
  type: QuoteItemType;
  refId: string | null;
  name: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
};

export type QuoteRow = {
  id: string;
  customerUserId: string | null;
  customerName: string;
  customerPhone: string | null;
  status: QuoteStatus;
  expiresAt: Date | null;
  discountCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: Date;
  items: QuoteItemRow[];
};

export type CreateQuoteInput = {
  customerUserId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  expiresAt?: Date | null;
  discountCents?: number;
  notes?: string | null;
  items: Array<{
    type: QuoteItemType;
    refId?: string | null;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
};

function computeTotal(
  items: Array<{ quantity: number; unitPriceCents: number }>,
  discountCents: number,
): number {
  const subtotal = items.reduce(
    (acc, i) => acc + i.quantity * i.unitPriceCents,
    0,
  );
  return Math.max(0, subtotal - discountCents);
}

export async function listQuotes(
  organizationId: string,
): Promise<QuoteRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.quote.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { items: { orderBy: { name: "asc" } } },
    });
    return rows.map((q) => ({
      id: q.id,
      customerUserId: q.customerUserId,
      customerName: q.customerName,
      customerPhone: q.customerPhone,
      status: q.status,
      expiresAt: q.expiresAt,
      discountCents: q.discountCents,
      totalCents: q.totalCents,
      notes: q.notes,
      createdAt: q.createdAt,
      items: q.items.map((i) => ({
        id: i.id,
        type: i.type,
        refId: i.refId,
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        subtotalCents: i.quantity * i.unitPriceCents,
      })),
    }));
  });
}

export async function getQuote(
  organizationId: string,
  id: string,
): Promise<QuoteRow | null> {
  return withTenant(organizationId, async (db) => {
    const q = await db.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { name: "asc" } } },
    });
    if (!q) return null;
    return {
      id: q.id,
      customerUserId: q.customerUserId,
      customerName: q.customerName,
      customerPhone: q.customerPhone,
      status: q.status,
      expiresAt: q.expiresAt,
      discountCents: q.discountCents,
      totalCents: q.totalCents,
      notes: q.notes,
      createdAt: q.createdAt,
      items: q.items.map((i) => ({
        id: i.id,
        type: i.type,
        refId: i.refId,
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        subtotalCents: i.quantity * i.unitPriceCents,
      })),
    };
  });
}

export async function createQuote(
  organizationId: string,
  input: CreateQuoteInput,
): Promise<{ id: string }> {
  const discountCents = input.discountCents ?? 0;
  const totalCents = computeTotal(input.items, discountCents);
  return withTenant(organizationId, async (db) => {
    return db.quote.create({
      data: {
        organizationId,
        customerUserId: input.customerUserId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        expiresAt: input.expiresAt ?? null,
        discountCents,
        totalCents,
        notes: input.notes ?? null,
        items: {
          create: input.items.map((i) => ({
            type: i.type,
            refId: i.refId ?? null,
            name: i.name,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
          })),
        },
      },
      select: { id: true },
    });
  });
}

export async function updateQuoteStatus(
  organizationId: string,
  id: string,
  status: QuoteStatus,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.quote.update({ where: { id }, data: { status } });
  });
}

export async function deleteQuote(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.quote.delete({ where: { id } });
  });
}

/**
 * Gera texto formatado pro WhatsApp share. Reusa o domain mas mantem
 * no server pra incluir nome da org consistente.
 */
export function buildQuoteWhatsAppText(
  quote: QuoteRow,
  orgName: string,
): string {
  const lines: string[] = [
    `Orçamento — ${orgName}`,
    `Para: ${quote.customerName}`,
    "",
  ];
  for (const item of quote.items) {
    const total = (item.subtotalCents / 100).toFixed(2).replace(".", ",");
    lines.push(`${item.quantity}× ${item.name} — R$ ${total}`);
  }
  if (quote.discountCents > 0) {
    const disc = (quote.discountCents / 100).toFixed(2).replace(".", ",");
    lines.push(`Desconto: -R$ ${disc}`);
  }
  lines.push("");
  const total = (quote.totalCents / 100).toFixed(2).replace(".", ",");
  lines.push(`TOTAL: R$ ${total}`);
  if (quote.expiresAt) {
    lines.push(
      `Válido até: ${quote.expiresAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`,
    );
  }
  if (quote.notes) {
    lines.push("", quote.notes);
  }
  return lines.join("\n");
}
