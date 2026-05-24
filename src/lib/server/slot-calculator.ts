import { fromZonedTime } from "date-fns-tz";

import type { Weekday } from "@prisma/client";

/**
 * Faixa de horário de trabalho de um profissional num weekday específico,
 * em minutos desde 00:00 local.
 */
export type WorkingWindow = {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
};

/**
 * Intervalo ocupado (appointment confirmado ou bloqueio), em UTC.
 * Range é semi-aberto `[startsAt, endsAt)` — terminar 10:00 e começar 10:00
 * não conflita (RN-CB-01).
 */
export type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type AvailableSlot = {
  startMinute: number;
  startUtc: Date;
};

export type CalculateSlotsArgs = {
  workingHours: WorkingWindow[];
  existingAppointments: BusyInterval[];
  blocks: BusyInterval[];
  durationMinutes: number;
  date: string; // 'YYYY-MM-DD' local
  timezone: string; // ex: 'America/Sao_Paulo'
  minAdvanceMinutes: number;
  now?: Date;
  step?: number;
};

const WEEKDAYS_BY_INDEX: Weekday[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

/**
 * Calcula slots disponíveis para um profissional num dia específico.
 *
 * Função PURA — sem I/O, sem `Date.now()` escondido. `now` é injetável.
 *
 * Implementa RN-03, RN-04, RN-05. Range `[)` em todos os cálculos (RN-CB-01).
 */
export function calculateAvailableSlots(args: CalculateSlotsArgs): AvailableSlot[] {
  const {
    workingHours,
    existingAppointments,
    blocks,
    durationMinutes,
    date,
    timezone,
    minAdvanceMinutes,
    now = new Date(),
    step = 15,
  } = args;

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("durationMinutes deve ser inteiro positivo");
  }
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error("step deve ser inteiro positivo");
  }

  const weekday = weekdayFromIsoDate(date, timezone);
  const windows = workingHours.filter((w) => w.weekday === weekday);
  if (windows.length === 0) return [];

  const minAdvanceMs = minAdvanceMinutes * 60_000;
  const result: AvailableSlot[] = [];

  for (const window of windows) {
    const lastStart = window.endMinute - durationMinutes;
    for (let m = window.startMinute; m <= lastStart; m += step) {
      const startUtc = localMinutesToUtc(date, m, timezone);

      if (startUtc.getTime() < now.getTime() + minAdvanceMs) continue;

      const endUtc = new Date(startUtc.getTime() + durationMinutes * 60_000);

      if (overlapsAny(existingAppointments, startUtc, endUtc)) continue;
      if (overlapsAny(blocks, startUtc, endUtc)) continue;

      result.push({ startMinute: m, startUtc });
    }
  }

  return result;
}

function overlapsAny(intervals: BusyInterval[], startUtc: Date, endUtc: Date): boolean {
  for (const i of intervals) {
    if (i.startsAt.getTime() < endUtc.getTime() && startUtc.getTime() < i.endsAt.getTime()) {
      return true;
    }
  }
  return false;
}

function localMinutesToUtc(dateIso: string, minutes: number, timezone: string): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateIso}T${hh}:${mm}:00`, timezone);
}

function weekdayFromIsoDate(dateIso: string, timezone: string): Weekday {
  const noon = fromZonedTime(`${dateIso}T12:00:00`, timezone);
  const dayInTz = new Date(noon.toLocaleString("en-US", { timeZone: timezone }));
  return WEEKDAYS_BY_INDEX[dayInTz.getDay()]!;
}
