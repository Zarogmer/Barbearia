import "server-only";

import { unstable_cache } from "next/cache";

import { withTenant } from "@/lib/db";

/**
 * Relatórios financeiros (PBI-17).
 *
 * Fonte de faturamento: Comandas com status CLOSED.
 * Total = SUM(items.qty * items.price) - discountCents (já agregado).
 *
 * Datas: filtra por closedAt no fuso do servidor (UTC). Frontend converte
 * pra timezone da org só na apresentação.
 *
 * Cache: 60s via unstable_cache — relatórios não mudam por segundo;
 * trade pra evitar agregação repetida em refresh do dashboard.
 */

export type ReportPeriod = {
  start: Date;
  end: Date;
};

export type FinancialReport = {
  totalRevenueCents: number;
  totalAttendances: number;
  ticketAverageCents: number;
  cancelledCount: number;
  noShowCount: number;
  byProfessional: Array<{
    professionalId: string;
    professionalName: string;
    revenueCents: number;
    attendances: number;
    ticketAverageCents: number;
  }>;
  byDay: Array<{
    date: string; // YYYY-MM-DD UTC
    revenueCents: number;
    attendances: number;
  }>;
  byPaymentMethod: Array<{
    method: "CASH" | "PIX" | "CREDIT" | "DEBIT" | "CORTESIA";
    amountCents: number;
    count: number;
  }>;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function _getFinancialReport(
  organizationId: string,
  period: ReportPeriod,
  professionalId: string | null,
): Promise<FinancialReport> {
  return withTenant(organizationId, async (db) => {
    const whereClosed = {
      status: "CLOSED" as const,
      closedAt: { gte: period.start, lt: period.end },
      ...(professionalId ? { professionalId } : {}),
    };

    const [comandas, cancelled, noShow] = await Promise.all([
      db.comanda.findMany({
        where: whereClosed,
        select: {
          id: true,
          professionalId: true,
          closedAt: true,
          discountCents: true,
          professional: { select: { name: true } },
          items: { select: { quantity: true, unitPriceCents: true } },
          payments: { select: { method: true, amountCents: true } },
        },
      }),
      // Cancelled appointments no mesmo período (independe de comanda)
      db.appointment.count({
        where: {
          status: "CANCELLED",
          startsAt: { gte: period.start, lt: period.end },
          ...(professionalId ? { professionalId } : {}),
        },
      }),
      db.appointment.count({
        where: {
          status: "NO_SHOW",
          startsAt: { gte: period.start, lt: period.end },
          ...(professionalId ? { professionalId } : {}),
        },
      }),
    ]);

    // Totais
    let totalRevenue = 0;
    const totalAttendances = comandas.length;

    const byProf = new Map<
      string,
      { name: string; revenue: number; count: number }
    >();
    const byDay = new Map<string, { revenue: number; count: number }>();
    const byMethod = new Map<
      string,
      { amount: number; count: number }
    >();

    for (const c of comandas) {
      const subtotal = c.items.reduce(
        (acc, i) => acc + i.quantity * i.unitPriceCents,
        0,
      );
      const total = Math.max(0, subtotal - c.discountCents);
      totalRevenue += total;

      const prof = byProf.get(c.professionalId) ?? {
        name: c.professional.name,
        revenue: 0,
        count: 0,
      };
      prof.revenue += total;
      prof.count += 1;
      byProf.set(c.professionalId, prof);

      if (c.closedAt) {
        const key = dayKey(c.closedAt);
        const d = byDay.get(key) ?? { revenue: 0, count: 0 };
        d.revenue += total;
        d.count += 1;
        byDay.set(key, d);
      }

      for (const p of c.payments) {
        const m = byMethod.get(p.method) ?? { amount: 0, count: 0 };
        m.amount += p.amountCents;
        m.count += 1;
        byMethod.set(p.method, m);
      }
    }

    const ticketAverage =
      totalAttendances > 0 ? Math.round(totalRevenue / totalAttendances) : 0;

    return {
      totalRevenueCents: totalRevenue,
      totalAttendances,
      ticketAverageCents: ticketAverage,
      cancelledCount: cancelled,
      noShowCount: noShow,
      byProfessional: Array.from(byProf.entries())
        .map(([id, v]) => ({
          professionalId: id,
          professionalName: v.name,
          revenueCents: v.revenue,
          attendances: v.count,
          ticketAverageCents:
            v.count > 0 ? Math.round(v.revenue / v.count) : 0,
        }))
        .sort((a, b) => b.revenueCents - a.revenueCents),
      byDay: Array.from(byDay.entries())
        .map(([date, v]) => ({
          date,
          revenueCents: v.revenue,
          attendances: v.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byPaymentMethod: Array.from(byMethod.entries())
        .map(([method, v]) => ({
          method: method as FinancialReport["byPaymentMethod"][number]["method"],
          amountCents: v.amount,
          count: v.count,
        }))
        .sort((a, b) => b.amountCents - a.amountCents),
    };
  });
}

export async function getFinancialReport(
  organizationId: string,
  period: ReportPeriod,
  professionalId: string | null = null,
): Promise<FinancialReport> {
  // Cache key inclui orgId + range + filter
  const cached = unstable_cache(
    async () =>
      _getFinancialReport(organizationId, period, professionalId),
    [
      "financial-report-v1",
      organizationId,
      period.start.toISOString(),
      period.end.toISOString(),
      professionalId ?? "all",
    ],
    { revalidate: 60, tags: [`reports-${organizationId}`] },
  );
  return cached();
}
