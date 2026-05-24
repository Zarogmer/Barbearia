import "server-only";

import type { Weekday } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";

import { withTenant } from "@/lib/db";

const WEEKDAYS_BY_INDEX: Weekday[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

const DAY_MS = 86_400_000;

export type DashboardUpcomingAppointment = {
  id: string;
  startsAt: Date;
  customerName: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
  professionalName: string;
};

export type DashboardStats = {
  todayCount: number;
  estimatedRevenueCents: number;
  occupancyPercent: number;
  noShowCount7d: number;
  upcomingAppointments: DashboardUpcomingAppointment[];
  timezone: string;
  todayIso: string;
};

/**
 * Estatísticas do dia para o dashboard admin. RLS via withTenant garante
 * isolamento; OWNER vê tudo, STAFF (não implementado nesta tela ainda)
 * veria só dados próprios via filtro upstream.
 *
 * Range UTC ±24h do dia local — folga pra cobrir qualquer fuso sem perder
 * intervalos. Filtragem fina por dia local feita pós-query.
 */
export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const tz = org.timezone;
    const now = new Date();

    const todayLocal = toZonedTime(now, tz);
    const todayIso = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`;
    const weekday = WEEKDAYS_BY_INDEX[todayLocal.getDay()]!;

    const dayStartUtc = new Date(new Date(`${todayIso}T00:00:00Z`).getTime() - DAY_MS);
    const dayEndUtc = new Date(new Date(`${todayIso}T00:00:00Z`).getTime() + 2 * DAY_MS);
    const sevenDaysAgoUtc = new Date(now.getTime() - 7 * DAY_MS);

    const [todayApptRows, workingHoursRows, noShowCount, upcomingRows] = await Promise.all([
      db.appointment.findMany({
        where: {
          status: "CONFIRMED",
          startsAt: { gte: dayStartUtc, lt: dayEndUtc },
        },
        select: {
          startsAt: true,
          endsAt: true,
          service: { select: { priceCents: true, durationMinutes: true } },
        },
      }),
      db.workingHours.findMany({
        where: {
          weekday,
          professional: { active: true },
        },
        select: { startMinute: true, endMinute: true },
      }),
      db.appointment.count({
        where: {
          status: "NO_SHOW",
          startsAt: { gte: sevenDaysAgoUtc, lte: now },
        },
      }),
      db.appointment.findMany({
        where: {
          status: "CONFIRMED",
          startsAt: { gte: now, lt: dayEndUtc },
        },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: {
          id: true,
          startsAt: true,
          customerName: true,
          service: {
            select: { name: true, durationMinutes: true, priceCents: true },
          },
          professional: { select: { name: true } },
        },
      }),
    ]);

    // Filtra appointments cuja parte local cai no dia (descarta os que
    // estão no range UTC mas pertencem a outro dia local).
    const todayInTzMs = isoDayMatches(todayIso, tz);
    const todayAppts = todayApptRows.filter((a) => todayInTzMs(a.startsAt));

    const todayCount = todayAppts.length;
    const estimatedRevenueCents = todayAppts.reduce(
      (acc, a) => acc + a.service.priceCents,
      0,
    );

    // Ocupação = soma de duração de appointments / soma de minutos de
    // working hours do dia. Sem working hours → 0.
    const totalWorkingMinutes = workingHoursRows.reduce(
      (acc, w) => acc + (w.endMinute - w.startMinute),
      0,
    );
    const totalBookedMinutes = todayAppts.reduce(
      (acc, a) => acc + a.service.durationMinutes,
      0,
    );
    const occupancyPercent =
      totalWorkingMinutes > 0
        ? Math.min(100, Math.round((totalBookedMinutes / totalWorkingMinutes) * 100))
        : 0;

    const upcomingFiltered = upcomingRows.filter((a) => todayInTzMs(a.startsAt));
    const upcomingAppointments: DashboardUpcomingAppointment[] = upcomingFiltered.map(
      (a) => ({
        id: a.id,
        startsAt: a.startsAt,
        customerName: a.customerName,
        serviceName: a.service.name,
        serviceDurationMinutes: a.service.durationMinutes,
        servicePriceCents: a.service.priceCents,
        professionalName: a.professional.name,
      }),
    );

    return {
      todayCount,
      estimatedRevenueCents,
      occupancyPercent,
      noShowCount7d: noShowCount,
      upcomingAppointments,
      timezone: tz,
      todayIso,
    };
  });
}

function isoDayMatches(targetIso: string, timezone: string): (d: Date) => boolean {
  return (d: Date) => {
    const z = toZonedTime(d, timezone);
    const iso = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`;
    return iso === targetIso;
  };
}
