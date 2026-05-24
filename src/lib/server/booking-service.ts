import "server-only";

import { withTenant } from "@/lib/db";

import {
  calculateAvailableSlots,
  type AvailableSlot,
  type BusyInterval,
  type WorkingWindow,
} from "./slot-calculator";

const DEFAULT_MIN_ADVANCE_MINUTES = 30;

export type GetAvailableSlotsArgs = {
  organizationId: string;
  professionalId: string;
  serviceId: string;
  date: string; // 'YYYY-MM-DD' local
  now?: Date;
  force?: boolean; // admin walk-in: ignora antecedência
};

/**
 * Carrega WorkingHours + appointments + blocks + service + org do banco
 * (com RLS via `withTenant`) e devolve slots calculados.
 *
 * Em `force: true`, antecedência mínima vai a zero (RN-11 — encaixe admin).
 * RN-04 anti-conflito segue ativo mesmo com force.
 */
export async function getAvailableSlots(
  args: GetAvailableSlotsArgs,
): Promise<AvailableSlot[]> {
  const { organizationId, professionalId, serviceId, date, now, force } = args;

  return withTenant(organizationId, async (db) => {
    const [org, service, workingHoursRows, appointmentRows, blockRows] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      }),
      db.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: { durationMinutes: true, active: true },
      }),
      db.workingHours.findMany({
        where: { professionalId },
        select: { weekday: true, startMinute: true, endMinute: true },
      }),
      db.appointment.findMany({
        where: {
          professionalId,
          status: "CONFIRMED",
          startsAt: { gte: dayStartUtc(date), lt: dayEndUtc(date) },
        },
        select: { startsAt: true, endsAt: true },
      }),
      db.timeBlock.findMany({
        where: {
          professionalId,
          startsAt: { lt: dayEndUtc(date) },
          endsAt: { gt: dayStartUtc(date) },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    if (!service.active) return [];

    const workingHours: WorkingWindow[] = workingHoursRows;
    const existingAppointments: BusyInterval[] = appointmentRows;
    const blocks: BusyInterval[] = blockRows;

    return calculateAvailableSlots({
      workingHours,
      existingAppointments,
      blocks,
      durationMinutes: service.durationMinutes,
      date,
      timezone: org.timezone,
      minAdvanceMinutes: force ? 0 : DEFAULT_MIN_ADVANCE_MINUTES,
      now,
    });
  });
}

const DAY_MS = 86_400_000;
// Pega ±24h em UTC do dia local. Folga cobre qualquer fuso ±12h sem perder
// intervalos que cruzam o dia. Filtro fino é o overlap-check do calculator.
function dayStartUtc(dateIso: string): Date {
  return new Date(new Date(`${dateIso}T00:00:00Z`).getTime() - DAY_MS);
}
function dayEndUtc(dateIso: string): Date {
  return new Date(new Date(`${dateIso}T00:00:00Z`).getTime() + 2 * DAY_MS);
}
