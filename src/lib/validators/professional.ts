import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type WeekdayKey = (typeof WEEKDAYS)[number];
export const WEEKDAY_VALUES = WEEKDAYS;

export const professionalBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome precisa ter pelo menos 2 caracteres")
    .max(80, "Nome muito longo (máx 80)"),
  bio: z
    .string()
    .trim()
    .max(500, "Bio muito longa (máx 500)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  photoUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  active: z.boolean().default(true),
  serviceIds: z.array(UUID).max(100, "Máximo 100 serviços por profissional").default([]),
});

export const createProfessionalSchema = professionalBaseSchema;
export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;

export const updateProfessionalSchema = professionalBaseSchema.extend({ id: UUID });
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;

export function professionalFormDataToInput(formData: FormData): unknown {
  const serviceIds = formData
    .getAll("serviceIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  return {
    name: formData.get("name"),
    bio: formData.get("bio"),
    photoUrl: formData.get("photoUrl"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    serviceIds,
  };
}

// ── WorkingHours ──────────────────────────────────────────────

const minuteOfDay = z
  .number({ message: "Horário obrigatório" })
  .int()
  .min(0, "Mínimo 00:00")
  .max(1440, "Máximo 24:00")
  .refine((n) => n % 5 === 0, "Horário precisa ser múltiplo de 5 min");

const singleWindow = z
  .object({
    weekday: z.enum(WEEKDAYS),
    startMinute: minuteOfDay,
    endMinute: minuteOfDay,
  })
  .refine((w) => w.startMinute < w.endMinute, {
    message: "Início precisa ser antes do fim",
    path: ["endMinute"],
  });

export const workingHoursArraySchema = z
  .array(singleWindow)
  .max(50, "Muitas faixas")
  .superRefine((arr, ctx) => {
    // Detecta sobreposição entre faixas do mesmo weekday.
    const byDay = new Map<WeekdayKey, { start: number; end: number; idx: number }[]>();
    arr.forEach((w, idx) => {
      const day = w.weekday;
      const list = byDay.get(day) ?? [];
      list.push({ start: w.startMinute, end: w.endMinute, idx });
      byDay.set(day, list);
    });
    for (const list of byDay.values()) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        if (list[i]!.start < list[i - 1]!.end) {
          ctx.addIssue({
            code: "custom",
            message: "Faixas sobrepostas no mesmo dia",
            path: [list[i]!.idx, "startMinute"],
          });
        }
      }
    }
  });

export type WorkingHoursWindow = z.infer<typeof singleWindow>;

// ── TimeBlock ─────────────────────────────────────────────────

export const timeBlockSchema = z
  .object({
    professionalId: UUID,
    startsAt: z
      .union([z.string().datetime(), z.date()])
      .transform((v) => (v instanceof Date ? v : new Date(v))),
    endsAt: z
      .union([z.string().datetime(), z.date()])
      .transform((v) => (v instanceof Date ? v : new Date(v))),
    reason: z
      .string()
      .trim()
      .max(280)
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.startsAt.getTime() < v.endsAt.getTime(), {
    message: "Início precisa ser antes do fim",
    path: ["endsAt"],
  });

export type TimeBlockInput = z.infer<typeof timeBlockSchema>;

/**
 * Combina date local (YYYY-MM-DD) + HH:MM no fuso da org num Date UTC.
 * Wrapper local pra não importar date-fns-tz no validator (mantém pure).
 * O caller (Server Action) converte com fromZonedTime antes de passar.
 */
export function timeBlockFormDataToInput(
  formData: FormData,
  startsAt: Date,
  endsAt: Date,
): unknown {
  return {
    professionalId: formData.get("professionalId"),
    startsAt,
    endsAt,
    reason: formData.get("reason"),
  };
}
