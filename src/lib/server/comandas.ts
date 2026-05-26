import "server-only";

import { withTenant } from "@/lib/db";
import type {
  AddItemInput,
  AddPaymentInput,
  ApplyDiscountInput,
  OpenComandaInput,
} from "@/lib/validators/comanda";

export type ComandaListItem = {
  id: string;
  customerName: string;
  customerUserId: string | null;
  professionalName: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  openedAt: Date;
  closedAt: Date | null;
  totalCents: number;
  paidCents: number;
  itemsCount: number;
};

export type ComandaDetail = {
  id: string;
  organizationId: string;
  customerName: string;
  customerUserId: string | null;
  professionalId: string;
  professionalName: string;
  appointmentId: string | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  discountCents: number;
  items: {
    id: string;
    type: "SERVICE" | "PRODUCT";
    refId: string | null;
    name: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
  }[];
  payments: {
    id: string;
    method: "CASH" | "PIX" | "CREDIT" | "DEBIT" | "CORTESIA";
    amountCents: number;
    paidAt: Date;
  }[];
  itemsSubtotalCents: number;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
};

export class ComandaError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "NOT_OPEN"
      | "INVALID_AMOUNT"
      | "UNDERPAID"
      | "OVERPAID"
      | "VALIDATION"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "ComandaError";
  }
}

// ────────────────────────────────────────────────────────
// Listagens
// ────────────────────────────────────────────────────────

export async function listComandas(
  organizationId: string,
  filter: "OPEN" | "CLOSED" | "ALL",
): Promise<ComandaListItem[]> {
  return withTenant(organizationId, async (db) => {
    const where = filter === "ALL" ? {} : { status: filter };
    const rows = await db.comanda.findMany({
      where,
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        customerName: true,
        customerUserId: true,
        status: true,
        openedAt: true,
        closedAt: true,
        discountCents: true,
        professional: { select: { name: true } },
        items: { select: { quantity: true, unitPriceCents: true } },
        payments: { select: { amountCents: true } },
        _count: { select: { items: true } },
      },
    });

    return rows.map((c) => {
      const itemsSubtotal = c.items.reduce(
        (acc, i) => acc + i.quantity * i.unitPriceCents,
        0,
      );
      const total = Math.max(0, itemsSubtotal - c.discountCents);
      const paid = c.payments.reduce((acc, p) => acc + p.amountCents, 0);
      return {
        id: c.id,
        customerName: c.customerName,
        customerUserId: c.customerUserId,
        professionalName: c.professional.name,
        status: c.status,
        openedAt: c.openedAt,
        closedAt: c.closedAt,
        totalCents: total,
        paidCents: paid,
        itemsCount: c._count.items,
      };
    });
  });
}

export async function getComandaDetail(
  organizationId: string,
  comandaId: string,
): Promise<ComandaDetail | null> {
  return withTenant(organizationId, async (db) => {
    const c = await db.comanda.findUnique({
      where: { id: comandaId },
      select: {
        id: true,
        organizationId: true,
        customerName: true,
        customerUserId: true,
        professionalId: true,
        appointmentId: true,
        status: true,
        notes: true,
        openedAt: true,
        closedAt: true,
        discountCents: true,
        professional: { select: { name: true } },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            refId: true,
            name: true,
            quantity: true,
            unitPriceCents: true,
          },
        },
        payments: {
          orderBy: { paidAt: "asc" },
          select: {
            id: true,
            method: true,
            amountCents: true,
            paidAt: true,
          },
        },
      },
    });
    if (!c) return null;

    const items = c.items.map((i) => ({
      ...i,
      subtotalCents: i.quantity * i.unitPriceCents,
    }));
    const itemsSubtotal = items.reduce((acc, i) => acc + i.subtotalCents, 0);
    const total = Math.max(0, itemsSubtotal - c.discountCents);
    const paid = c.payments.reduce((acc, p) => acc + p.amountCents, 0);

    return {
      id: c.id,
      organizationId: c.organizationId,
      customerName: c.customerName,
      customerUserId: c.customerUserId,
      professionalId: c.professionalId,
      professionalName: c.professional.name,
      appointmentId: c.appointmentId,
      status: c.status,
      notes: c.notes,
      openedAt: c.openedAt,
      closedAt: c.closedAt,
      discountCents: c.discountCents,
      items,
      payments: c.payments,
      itemsSubtotalCents: itemsSubtotal,
      totalCents: total,
      paidCents: paid,
      remainingCents: total - paid,
    };
  });
}

// ────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────

export async function openComanda(
  organizationId: string,
  input: OpenComandaInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.comanda.create({
      data: {
        organizationId,
        customerUserId: input.customerUserId,
        customerName: input.customerName,
        professionalId: input.professionalId,
        appointmentId: input.appointmentId,
        notes: input.notes,
      },
      select: { id: true },
    });
  });
}

async function ensureOpen(
  db: Parameters<Parameters<typeof withTenant>[1]>[0],
  comandaId: string,
) {
  const c = await db.comanda.findUnique({
    where: { id: comandaId },
    select: { status: true },
  });
  if (!c) throw new ComandaError("Comanda não encontrada.", "NOT_FOUND");
  if (c.status !== "OPEN") {
    throw new ComandaError(
      `Comanda já está ${c.status === "CLOSED" ? "fechada" : "cancelada"}.`,
      "NOT_OPEN",
    );
  }
}

export async function addItem(
  organizationId: string,
  comandaId: string,
  input: AddItemInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await ensureOpen(db, comandaId);

    if (input.type === "SERVICE") {
      const service = await db.service.findUnique({
        where: { id: input.serviceId },
        select: { name: true, priceCents: true },
      });
      if (!service) {
        throw new ComandaError("Serviço inválido.", "VALIDATION");
      }
      await db.comandaItem.create({
        data: {
          comandaId,
          type: "SERVICE",
          refId: input.serviceId,
          name: service.name,
          quantity: input.quantity,
          unitPriceCents: service.priceCents,
        },
      });
    } else {
      // MANUAL → item livre (não tipa como PRODUCT pra não confundir com PBI-37)
      await db.comandaItem.create({
        data: {
          comandaId,
          type: "PRODUCT",
          name: input.name,
          quantity: input.quantity,
          unitPriceCents: input.unitPriceCents,
        },
      });
    }
  });
}

export async function removeItem(
  organizationId: string,
  comandaId: string,
  itemId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await ensureOpen(db, comandaId);
    await db.comandaItem.deleteMany({ where: { id: itemId, comandaId } });
  });
}

export async function applyDiscount(
  organizationId: string,
  comandaId: string,
  input: ApplyDiscountInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await ensureOpen(db, comandaId);
    await db.comanda.update({
      where: { id: comandaId },
      data: { discountCents: input.discountCents },
    });
  });
}

export async function addPayment(
  organizationId: string,
  comandaId: string,
  input: AddPaymentInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await ensureOpen(db, comandaId);

    // CORTESIA com amountCents 0 OK; outros métodos exigem > 0
    if (input.method !== "CORTESIA" && input.amountCents <= 0) {
      throw new ComandaError(
        "Valor do pagamento precisa ser maior que zero.",
        "INVALID_AMOUNT",
      );
    }

    await db.comandaPayment.create({
      data: {
        comandaId,
        method: input.method,
        amountCents: input.amountCents,
      },
    });
  });
}

export async function removePayment(
  organizationId: string,
  comandaId: string,
  paymentId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await ensureOpen(db, comandaId);
    await db.comandaPayment.deleteMany({ where: { id: paymentId, comandaId } });
  });
}

export async function closeComanda(
  organizationId: string,
  comandaId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    const c = await db.comanda.findUnique({
      where: { id: comandaId },
      select: {
        status: true,
        discountCents: true,
        items: { select: { quantity: true, unitPriceCents: true } },
        payments: { select: { amountCents: true } },
      },
    });
    if (!c) throw new ComandaError("Comanda não encontrada.", "NOT_FOUND");
    if (c.status !== "OPEN") {
      throw new ComandaError("Comanda já está fechada.", "NOT_OPEN");
    }

    const subtotal = c.items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);
    const total = Math.max(0, subtotal - c.discountCents);
    const paid = c.payments.reduce((acc, p) => acc + p.amountCents, 0);

    if (paid < total) {
      throw new ComandaError(
        `Faltam R$ ${((total - paid) / 100).toFixed(2)} pra fechar.`,
        "UNDERPAID",
      );
    }
    if (paid > total) {
      throw new ComandaError(
        `Pagamentos excedem o total em R$ ${((paid - total) / 100).toFixed(2)}.`,
        "OVERPAID",
      );
    }

    await db.comanda.update({
      where: { id: comandaId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  });
}

export async function cancelComanda(
  organizationId: string,
  comandaId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    const c = await db.comanda.findUnique({
      where: { id: comandaId },
      select: { status: true },
    });
    if (!c) throw new ComandaError("Comanda não encontrada.", "NOT_FOUND");
    if (c.status !== "OPEN") {
      throw new ComandaError("Só dá pra cancelar comanda aberta.", "NOT_OPEN");
    }
    await db.comanda.update({
      where: { id: comandaId },
      data: { status: "CANCELLED", closedAt: new Date() },
    });
  });
}
