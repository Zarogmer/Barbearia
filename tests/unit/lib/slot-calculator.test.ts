import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";

import {
  calculateAvailableSlots,
  type CalculateSlotsArgs,
  type WorkingWindow,
} from "@/lib/server/slot-calculator";

const TZ = "America/Sao_Paulo";
const DATE = "2026-06-01"; // segunda-feira
const SUNDAY = "2026-05-31";

function mondayFrom(startHour: number, endHour: number): WorkingWindow {
  return { weekday: "MON", startMinute: startHour * 60, endMinute: endHour * 60 };
}

function spLocal(hhmm: string): Date {
  return fromZonedTime(`${DATE}T${hhmm}:00`, TZ);
}

function spLocalOn(dateIso: string, hhmm: string): Date {
  return fromZonedTime(`${dateIso}T${hhmm}:00`, TZ);
}

function baseArgs(overrides: Partial<CalculateSlotsArgs> = {}): CalculateSlotsArgs {
  return {
    workingHours: [mondayFrom(9, 12)],
    existingAppointments: [],
    blocks: [],
    durationMinutes: 30,
    date: DATE,
    timezone: TZ,
    minAdvanceMinutes: 0,
    now: spLocal("00:00"), // 00:00 SP do dia → tudo no futuro
    ...overrides,
  };
}

describe("calculateAvailableSlots", () => {
  it("dia normal, 1 faixa 9–12, duration 30 → 11 slots de 15 em 15 (último 11:30)", () => {
    const slots = calculateAvailableSlots(baseArgs());
    expect(slots).toHaveLength(11);
    expect(slots[0]!.startMinute).toBe(9 * 60);
    expect(slots.at(-1)!.startMinute).toBe(11 * 60 + 30);
  });

  it("sem WorkingHours no weekday → []", () => {
    const slots = calculateAvailableSlots(baseArgs({ date: SUNDAY }));
    expect(slots).toEqual([]);
  });

  it("faixa 9–12, duration 60, step 15 → último slot 11:00 (cabe 11:00–12:00)", () => {
    const slots = calculateAvailableSlots(baseArgs({ durationMinutes: 60 }));
    expect(slots.at(-1)!.startMinute).toBe(11 * 60);
    expect(slots[0]!.startMinute).toBe(9 * 60);
  });

  it("faixa 9–12, duration 75 → último slot 10:45 (10:45+75=12:00)", () => {
    const slots = calculateAvailableSlots(baseArgs({ durationMinutes: 75 }));
    expect(slots.at(-1)!.startMinute).toBe(10 * 60 + 45);
  });

  it("bloqueio 11:00–11:30 elimina slots que cruzam (10:45, 11:00, 11:15)", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        blocks: [{ startsAt: spLocal("11:00"), endsAt: spLocal("11:30") }],
      }),
    );
    const minutes = slots.map((s) => s.startMinute);
    expect(minutes).not.toContain(10 * 60 + 45);
    expect(minutes).not.toContain(11 * 60);
    expect(minutes).not.toContain(11 * 60 + 15);
    expect(minutes).toContain(11 * 60 + 30);
  });

  it("appointment 10:00–10:30 com duration 30 elimina 9:45, 10:00, 10:15", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        existingAppointments: [{ startsAt: spLocal("10:00"), endsAt: spLocal("10:30") }],
      }),
    );
    const minutes = slots.map((s) => s.startMinute);
    expect(minutes).not.toContain(9 * 60 + 45);
    expect(minutes).not.toContain(10 * 60);
    expect(minutes).not.toContain(10 * 60 + 15);
    expect(minutes).toContain(10 * 60 + 30);
  });

  it("slot terminando exatamente em 12:00 com fim de faixa 12:00 → válido (RN-CB-01)", () => {
    const slots = calculateAvailableSlots(baseArgs({ durationMinutes: 60 }));
    expect(slots.some((s) => s.startMinute === 11 * 60)).toBe(true);
  });

  it("próximo após appointment que termina 10:00 → 10:00 válido (range [))", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        existingAppointments: [{ startsAt: spLocal("09:30"), endsAt: spLocal("10:00") }],
      }),
    );
    expect(slots.some((s) => s.startMinute === 10 * 60)).toBe(true);
  });

  it("antecedência: now=09:30, minAdvance=30 → 09:30 falha (não satisfaz >=), 10:00 passa", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        now: spLocal("09:30"),
        minAdvanceMinutes: 30,
      }),
    );
    const minutes = slots.map((s) => s.startMinute);
    expect(minutes).not.toContain(9 * 60 + 30); // 9:30 não satisfaz < (9:30 + 30min) = 10:00
    expect(minutes).not.toContain(9 * 60 + 45);
    expect(minutes).toContain(10 * 60);
  });

  it("antecedência 31min com now=09:30 → 10:00 falha (10:00 < 10:01)", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        now: spLocal("09:30"),
        minAdvanceMinutes: 31,
      }),
    );
    const minutes = slots.map((s) => s.startMinute);
    expect(minutes).not.toContain(10 * 60);
    expect(minutes).toContain(10 * 60 + 15);
  });

  it("fuso: data 2026-06-01 em SP, primeiro slot 09:00 local = 12:00 UTC", () => {
    const slots = calculateAvailableSlots(baseArgs());
    expect(slots[0]!.startUtc.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });

  it("múltiplas faixas 9–12 + 14–18: pula 12:00–14:00 e retoma", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        workingHours: [mondayFrom(9, 12), mondayFrom(14, 18)],
      }),
    );
    const minutes = slots.map((s) => s.startMinute);
    expect(minutes).toContain(11 * 60 + 30);
    expect(minutes).not.toContain(12 * 60);
    expect(minutes).not.toContain(13 * 60 + 30);
    expect(minutes).toContain(14 * 60);
  });

  it("step 30 com duration 30 → slots 9:00, 9:30, 10:00, ...", () => {
    const slots = calculateAvailableSlots(baseArgs({ step: 30 }));
    const minutes = slots.map((s) => s.startMinute);
    expect(minutes).toEqual([
      9 * 60,
      9 * 60 + 30,
      10 * 60,
      10 * 60 + 30,
      11 * 60,
      11 * 60 + 30,
    ]);
  });

  it("slots crescem monotonicamente", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        workingHours: [mondayFrom(9, 12), mondayFrom(14, 18)],
      }),
    );
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.startUtc.getTime()).toBeGreaterThan(slots[i - 1]!.startUtc.getTime());
    }
  });

  it("duration 0 → throw", () => {
    expect(() => calculateAvailableSlots(baseArgs({ durationMinutes: 0 }))).toThrow(
      /durationMinutes/,
    );
  });

  it("duration negativa → throw", () => {
    expect(() => calculateAvailableSlots(baseArgs({ durationMinutes: -15 }))).toThrow(
      /durationMinutes/,
    );
  });

  it("step inválido (0) → throw", () => {
    expect(() => calculateAvailableSlots(baseArgs({ step: 0 }))).toThrow(/step/);
  });

  it("bloqueio que cobre toda a faixa → []", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        blocks: [{ startsAt: spLocal("09:00"), endsAt: spLocal("12:00") }],
      }),
    );
    expect(slots).toEqual([]);
  });

  it("dia inteiro no passado (now > último slot possível) → []", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        now: spLocalOn("2026-06-02", "00:00"),
        minAdvanceMinutes: 0,
      }),
    );
    expect(slots).toEqual([]);
  });

  it("appointment que termina antes do início da faixa não afeta nada", () => {
    const slots = calculateAvailableSlots(
      baseArgs({
        existingAppointments: [
          { startsAt: spLocalOn("2026-05-31", "23:00"), endsAt: spLocalOn("2026-06-01", "08:00") },
        ],
      }),
    );
    expect(slots).toHaveLength(11);
  });
});
