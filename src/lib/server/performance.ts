import "server-only";

import { unstable_cache } from "next/cache";

import { withTenant } from "@/lib/db";

/**
 * Performance por profissional (PBI-34).
 *
 * Diferente de reports.ts (que faz receita por Comanda fechada), aqui o
 * grão é Appointment — porque atendimento pode ter ocorrido sem abrir
 * Comanda completa (admin marca como pago direto pelo dialog na agenda).
 *
 * Fonte de cada métrica:
 *  - atendimentos = appointments status=COMPLETED
 *  - clientes únicos = distinct (userId || customerName) entre COMPLETED
 *  - horas trabalhadas = sum(service.durationMinutes) dos COMPLETED
 *  - receita bruta = sum(service.priceCents) dos COMPLETED
 *  - receita líquida = bruta - sum(service.costCents) dos COMPLETED
 *  - receita esperada = sum(service.priceCents) dos CONFIRMED futuros
 *  - no-show / cancel = appointments com status correspondente
 *  - taxa no-show = noShow / (completed + noShow) %
 *  - ticket médio = receita bruta / atendimentos
 *
 * Cache 60s — relatorio nao muda por segundo, evita re-agregar a cada
 * troca de range no UI.
 */

export type PerformanceRange = {
  start: Date;
  end: Date;
};

export type ProfessionalPerformance = {
  professionalId: string;
  professionalName: string;
  active: boolean;
  attendances: number;
  uniqueCustomers: number;
  workedMinutes: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  expectedRevenueCents: number;
  noShowCount: number;
  cancelCount: number;
  noShowRate: number; // 0..100
  averageTicketCents: number;
};

export type CompanyPerformance = {
  attendances: number;
  uniqueCustomers: number;
  workedMinutes: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  expectedRevenueCents: number;
  noShowCount: number;
  cancelCount: number;
  noShowRate: number;
  averageTicketCents: number;
};

export type PerformanceReport = {
  company: CompanyPerformance;
  byProfessional: ProfessionalPerformance[];
  rangeStart: Date;
  rangeEnd: Date;
};

async function _getPerformanceReport(
  organizationId: string,
  range: PerformanceRange,
): Promise<PerformanceReport> {
  return withTenant(organizationId, async (db) => {
    const now = new Date();
    const [professionals, finishedAppts, futureAppts, noShowAppts, cancelledAppts] =
      await Promise.all([
        db.professional.findMany({
          select: { id: true, name: true, active: true },
          orderBy: { name: "asc" },
        }),
        db.appointment.findMany({
          where: {
            status: "COMPLETED",
            startsAt: { gte: range.start, lt: range.end },
          },
          select: {
            professionalId: true,
            userId: true,
            customerName: true,
            service: { select: { priceCents: true, durationMinutes: true, costCents: true } },
          },
        }),
        // Receita esperada: CONFIRMED futuros (depois de "now") no range
        db.appointment.findMany({
          where: {
            status: "CONFIRMED",
            startsAt: { gte: range.start, lt: range.end },
          },
          select: {
            professionalId: true,
            startsAt: true,
            service: { select: { priceCents: true } },
          },
        }),
        db.appointment.findMany({
          where: {
            status: "NO_SHOW",
            startsAt: { gte: range.start, lt: range.end },
          },
          select: { professionalId: true },
        }),
        db.appointment.findMany({
          where: {
            status: "CANCELLED",
            startsAt: { gte: range.start, lt: range.end },
          },
          select: { professionalId: true },
        }),
      ]);

    // Agrega por profissional
    type Bucket = {
      attendances: number;
      customers: Set<string>;
      workedMinutes: number;
      gross: number;
      cost: number;
      expected: number;
      noShow: number;
      cancel: number;
    };
    const buckets = new Map<string, Bucket>();
    const ensure = (id: string): Bucket => {
      let b = buckets.get(id);
      if (!b) {
        b = {
          attendances: 0,
          customers: new Set<string>(),
          workedMinutes: 0,
          gross: 0,
          cost: 0,
          expected: 0,
          noShow: 0,
          cancel: 0,
        };
        buckets.set(id, b);
      }
      return b;
    };

    for (const a of finishedAppts) {
      const b = ensure(a.professionalId);
      b.attendances += 1;
      b.workedMinutes += a.service.durationMinutes;
      b.gross += a.service.priceCents;
      b.cost += a.service.costCents;
      b.customers.add(a.userId ?? `name:${a.customerName.toLowerCase()}`);
    }
    for (const a of futureAppts) {
      if (a.startsAt < now) continue; // ja deveria ter virado COMPLETED/NO_SHOW
      const b = ensure(a.professionalId);
      b.expected += a.service.priceCents;
    }
    for (const a of noShowAppts) ensure(a.professionalId).noShow += 1;
    for (const a of cancelledAppts) ensure(a.professionalId).cancel += 1;

    // Monta lista — inclui profissionais sem atendimento no periodo (zero)
    const byProfessional: ProfessionalPerformance[] = professionals.map((p) => {
      const b = buckets.get(p.id);
      const attendances = b?.attendances ?? 0;
      const noShow = b?.noShow ?? 0;
      const denom = attendances + noShow;
      const gross = b?.gross ?? 0;
      return {
        professionalId: p.id,
        professionalName: p.name,
        active: p.active,
        attendances,
        uniqueCustomers: b?.customers.size ?? 0,
        workedMinutes: b?.workedMinutes ?? 0,
        grossRevenueCents: gross,
        netRevenueCents: gross - (b?.cost ?? 0),
        expectedRevenueCents: b?.expected ?? 0,
        noShowCount: noShow,
        cancelCount: b?.cancel ?? 0,
        noShowRate: denom > 0 ? Math.round((noShow / denom) * 100) : 0,
        averageTicketCents: attendances > 0 ? Math.round(gross / attendances) : 0,
      };
    });

    // Company total
    const companyCustomers = new Set<string>();
    let companyAttendances = 0;
    let companyMinutes = 0;
    let companyGross = 0;
    let companyCost = 0;
    let companyExpected = 0;
    let companyNoShow = 0;
    let companyCancel = 0;
    for (const b of buckets.values()) {
      companyAttendances += b.attendances;
      companyMinutes += b.workedMinutes;
      companyGross += b.gross;
      companyCost += b.cost;
      companyExpected += b.expected;
      companyNoShow += b.noShow;
      companyCancel += b.cancel;
      for (const c of b.customers) companyCustomers.add(c);
    }
    const companyDenom = companyAttendances + companyNoShow;

    return {
      rangeStart: range.start,
      rangeEnd: range.end,
      company: {
        attendances: companyAttendances,
        uniqueCustomers: companyCustomers.size,
        workedMinutes: companyMinutes,
        grossRevenueCents: companyGross,
        netRevenueCents: companyGross - companyCost,
        expectedRevenueCents: companyExpected,
        noShowCount: companyNoShow,
        cancelCount: companyCancel,
        noShowRate:
          companyDenom > 0 ? Math.round((companyNoShow / companyDenom) * 100) : 0,
        averageTicketCents:
          companyAttendances > 0
            ? Math.round(companyGross / companyAttendances)
            : 0,
      },
      byProfessional,
    };
  });
}

export async function getPerformanceReport(
  organizationId: string,
  range: PerformanceRange,
): Promise<PerformanceReport> {
  const cached = unstable_cache(
    async () => _getPerformanceReport(organizationId, range),
    [
      "performance-report-v1",
      organizationId,
      range.start.toISOString(),
      range.end.toISOString(),
    ],
    { revalidate: 60, tags: [`performance-${organizationId}`] },
  );
  return cached();
}
