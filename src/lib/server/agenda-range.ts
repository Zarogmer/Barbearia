import "server-only";

import { withTenant } from "@/lib/db";

/**
 * Agendas em intervalo (semana/mês) — usado pelas vistas alternativas
 * (PBI agenda views). Versão simplificada do getDayAgenda focada em
 * agregação (não traz blocks nem grid de horas).
 */

export type RangeAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  customerName: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
  professionalId: string;
  professionalName: string;
};

export type WeekAgenda = {
  /** ISO YYYY-MM-DD do primeiro dia (domingo) */
  weekStart: string;
  appointments: RangeAppointment[];
  timezone: string;
};

export type MonthAgenda = {
  year: number;
  month: number; // 1-12
  /** Map "YYYY-MM-DD" → { count, revenueCents } */
  daysSummary: Record<string, { count: number; revenueCents: number }>;
  timezone: string;
};

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Semana de 7 dias começando no domingo do dateIso passado.
 * Não traz blocks (vista lista, sem grid de horas).
 */
export async function getWeekAgenda(args: {
  organizationId: string;
  dateIso: string; // qualquer dia da semana — calcula domingo
  onlyProfessionalId?: string;
}): Promise<WeekAgenda> {
  const { organizationId, dateIso, onlyProfessionalId } = args;
  const base = parseDate(dateIso);
  // Domingo da semana (UTC; alinha com filtro local com tolerância 24h
  // como no getDayAgenda)
  const dayOfWeek = base.getUTCDay();
  const weekStart = new Date(base);
  weekStart.setUTCDate(base.getUTCDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });

    const apts = await db.appointment.findMany({
      where: {
        organizationId,
        ...(onlyProfessionalId ? { professionalId: onlyProfessionalId } : {}),
        startsAt: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        customerName: true,
        professionalId: true,
        professional: { select: { name: true } },
        service: {
          select: {
            name: true,
            durationMinutes: true,
            priceCents: true,
          },
        },
      },
    });

    return {
      weekStart: isoDay(weekStart),
      timezone: org.timezone,
      appointments: apts.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        customerName: a.customerName,
        serviceName: a.service.name,
        serviceDurationMinutes: a.service.durationMinutes,
        servicePriceCents: a.service.priceCents,
        professionalId: a.professionalId,
        professionalName: a.professional.name,
      })),
    };
  });
}

/**
 * Agregação mensal: count + revenue por dia (vista calendário).
 * Não traz lista detalhada — só o resumo numerico pra heat map.
 */
export async function getMonthAgenda(args: {
  organizationId: string;
  year: number;
  month: number; // 1-12
  onlyProfessionalId?: string;
}): Promise<MonthAgenda> {
  const { organizationId, year, month, onlyProfessionalId } = args;
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });

    const apts = await db.appointment.findMany({
      where: {
        organizationId,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        ...(onlyProfessionalId ? { professionalId: onlyProfessionalId } : {}),
        startsAt: { gte: monthStart, lt: monthEnd },
      },
      select: {
        startsAt: true,
        service: { select: { priceCents: true } },
      },
    });

    const summary: MonthAgenda["daysSummary"] = {};
    for (const a of apts) {
      const key = isoDay(a.startsAt);
      const cur = summary[key] ?? { count: 0, revenueCents: 0 };
      cur.count += 1;
      cur.revenueCents += a.service.priceCents;
      summary[key] = cur;
    }

    return {
      year,
      month,
      daysSummary: summary,
      timezone: org.timezone,
    };
  });
}
