import "server-only";

import { withTenant } from "@/lib/db";
import type {
  CalculateCommissionInput,
  PayCommissionInput,
  UpsertCommissionRuleInput,
} from "@/lib/validators/commission";

export type CommissionRuleRow = {
  id: string;
  professionalId: string;
  professionalName: string;
  serviceId: string | null;
  serviceName: string | null; // "Padrão (todos serviços)" se null na UI
  percent: number;
};

export type CommissionCalculation = {
  professionalId: string;
  professionalName: string;
  periodStart: Date;
  periodEnd: Date;
  items: {
    comandaId: string;
    comandaShortId: string;
    serviceName: string;
    customerName: string;
    closedAt: Date;
    grossCents: number; // qty × unitPrice
    percent: number;
    commissionCents: number;
  }[];
  totalGrossCents: number;
  totalCommissionCents: number;
  defaultPercent: number; // regra default do prof
};

export type CommissionPaymentRow = {
  id: string;
  professionalId: string;
  professionalName: string;
  periodStart: Date;
  periodEnd: Date;
  totalGrossCents: number;
  totalCommissionCents: number;
  notes: string | null;
  paidAt: Date;
};

// ────────────────────────────────────────────────────────
// Rules
// ────────────────────────────────────────────────────────

export async function listCommissionRules(
  organizationId: string,
): Promise<CommissionRuleRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.commissionRule.findMany({
      orderBy: [{ professionalId: "asc" }, { serviceId: "asc" }],
      select: {
        id: true,
        professionalId: true,
        serviceId: true,
        percent: true,
        professional: { select: { name: true } },
      },
    });

    // serviceName precisa de outra query (service não tem FK direto na rule)
    const serviceIds = rows.map((r) => r.serviceId).filter((v): v is string => !!v);
    const services = serviceIds.length
      ? await db.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameByServiceId = new Map(services.map((s) => [s.id, s.name]));

    return rows.map((r) => ({
      id: r.id,
      professionalId: r.professionalId,
      professionalName: r.professional.name,
      serviceId: r.serviceId,
      serviceName: r.serviceId ? (nameByServiceId.get(r.serviceId) ?? null) : null,
      percent: r.percent,
    }));
  });
}

export async function upsertCommissionRule(
  organizationId: string,
  input: UpsertCommissionRuleInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    // Como Prisma não suporta upsert com chave parcial (COALESCE), faço
    // find + update/create manual
    const existing = await db.commissionRule.findFirst({
      where: {
        professionalId: input.professionalId,
        serviceId: input.serviceId ?? null,
      },
      select: { id: true },
    });
    if (existing) {
      const r = await db.commissionRule.update({
        where: { id: existing.id },
        data: { percent: input.percent },
        select: { id: true },
      });
      return r;
    }
    return db.commissionRule.create({
      data: {
        organizationId,
        professionalId: input.professionalId,
        serviceId: input.serviceId ?? null,
        percent: input.percent,
      },
      select: { id: true },
    });
  });
}

export async function deleteCommissionRule(
  organizationId: string,
  ruleId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.commissionRule.deleteMany({ where: { id: ruleId } });
  });
}

// ────────────────────────────────────────────────────────
// Calculation
// ────────────────────────────────────────────────────────

/**
 * Calcula comissão devida ao profissional no período.
 * Soma todos os ComandaItems do tipo SERVICE em Comandas CLOSED do
 * profissional, com closedAt dentro do range. Aplica % por (prof,
 * service) ou (prof, default) — senão 0%.
 */
export async function calculateCommission(
  organizationId: string,
  input: CalculateCommissionInput,
): Promise<CommissionCalculation | null> {
  const periodStart = new Date(`${input.periodStart}T00:00:00`);
  const periodEnd = new Date(`${input.periodEnd}T23:59:59.999`);

  return withTenant(organizationId, async (db) => {
    const professional = await db.professional.findUnique({
      where: { id: input.professionalId },
      select: { id: true, name: true },
    });
    if (!professional) return null;

    // Carrega rules do prof em batch
    const rules = await db.commissionRule.findMany({
      where: { professionalId: input.professionalId },
      select: { serviceId: true, percent: true },
    });
    const percentByServiceId = new Map<string, number>();
    let defaultPercent = 0;
    for (const r of rules) {
      if (r.serviceId === null) defaultPercent = r.percent;
      else percentByServiceId.set(r.serviceId, r.percent);
    }

    // Comandas CLOSED do prof no período
    const comandas = await db.comanda.findMany({
      where: {
        professionalId: input.professionalId,
        status: "CLOSED",
        closedAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { closedAt: "asc" },
      select: {
        id: true,
        customerName: true,
        closedAt: true,
        items: {
          where: { type: "SERVICE" },
          select: {
            refId: true,
            name: true,
            quantity: true,
            unitPriceCents: true,
          },
        },
      },
    });

    const items: CommissionCalculation["items"] = [];
    let totalGross = 0;
    let totalCommission = 0;

    for (const c of comandas) {
      for (const i of c.items) {
        const gross = i.quantity * i.unitPriceCents;
        const percent: number = i.refId
          ? (percentByServiceId.get(i.refId) ?? defaultPercent)
          : defaultPercent;
        const commission = Math.round((gross * percent) / 100);
        totalGross += gross;
        totalCommission += commission;
        items.push({
          comandaId: c.id,
          comandaShortId: c.id.slice(0, 8),
          serviceName: i.name,
          customerName: c.customerName,
          closedAt: c.closedAt!,
          grossCents: gross,
          percent,
          commissionCents: commission,
        });
      }
    }

    return {
      professionalId: professional.id,
      professionalName: professional.name,
      periodStart,
      periodEnd,
      items,
      totalGrossCents: totalGross,
      totalCommissionCents: totalCommission,
      defaultPercent,
    };
  });
}

// ────────────────────────────────────────────────────────
// Payment
// ────────────────────────────────────────────────────────

export async function payCommission(
  organizationId: string,
  input: PayCommissionInput,
): Promise<{ id: string; totalCommissionCents: number }> {
  const calc = await calculateCommission(organizationId, input);
  if (!calc) throw new Error("Profissional não encontrado.");

  return withTenant(organizationId, async (db) => {
    const r = await db.commissionPayment.create({
      data: {
        organizationId,
        professionalId: calc.professionalId,
        periodStart: calc.periodStart,
        periodEnd: calc.periodEnd,
        totalGrossCents: calc.totalGrossCents,
        totalCommissionCents: calc.totalCommissionCents,
        notes: input.notes,
      },
      select: { id: true, totalCommissionCents: true },
    });
    return r;
  });
}

export async function listCommissionPayments(
  organizationId: string,
  professionalId?: string,
): Promise<CommissionPaymentRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.commissionPayment.findMany({
      where: professionalId ? { professionalId } : {},
      orderBy: { paidAt: "desc" },
      take: 100,
      select: {
        id: true,
        professionalId: true,
        periodStart: true,
        periodEnd: true,
        totalGrossCents: true,
        totalCommissionCents: true,
        notes: true,
        paidAt: true,
        professional: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      professionalId: r.professionalId,
      professionalName: r.professional.name,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      totalGrossCents: r.totalGrossCents,
      totalCommissionCents: r.totalCommissionCents,
      notes: r.notes,
      paidAt: r.paidAt,
    }));
  });
}
