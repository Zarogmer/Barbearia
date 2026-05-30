import "server-only";

/**
 * Horário de funcionamento da org (PBI-26).
 *
 * Formato persistido em Organization.businessHours (JSON):
 *   { sun?: HoursBlock|null, mon?: ..., ..., sat?: ... }
 * onde HoursBlock = { open: number, close: number } em minutos do dia.
 * Dia ausente ou null = fechado.
 */

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export const WEEKDAYS: readonly Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  sun: "Domingo",
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  sun: "Dom",
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
};

export type HoursBlock = { open: number; close: number };
export type BusinessHours = Partial<Record<Weekday, HoursBlock | null>>;

export function isHoursBlock(v: unknown): v is HoursBlock {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.open === "number" &&
    typeof o.close === "number" &&
    o.open >= 0 &&
    o.close > o.open &&
    o.close <= 24 * 60
  );
}

export function parseBusinessHours(raw: unknown): BusinessHours | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: BusinessHours = {};
  for (const day of WEEKDAYS) {
    const v = o[day];
    if (v === null || v === undefined) {
      // sem entry = fechado, mas só anota explicitamente se foi null
      if (v === null) out[day] = null;
      continue;
    }
    if (isHoursBlock(v)) out[day] = v;
  }
  return out;
}

export function formatHours(block: HoursBlock | null | undefined): string {
  if (!block) return "Fechado";
  return `${minutesToHHMM(block.open)} – ${minutesToHHMM(block.close)}`;
}

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(h)}:${pad2(mm)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const WEEKDAY_BY_INDEX: readonly Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

/**
 * Determina se a org está aberta no momento, considerando timezone.
 * Calcula o dia da semana + minutos do dia no timezone fornecido.
 */
export function isOpenNow(
  hours: BusinessHours | null,
  timezone: string,
  now: Date = new Date(),
): boolean {
  if (!hours) return false;
  const { weekday, minutes } = getZonedDayMinutes(now, timezone);
  const block = hours[weekday];
  if (!block) return false;
  return minutes >= block.open && minutes < block.close;
}

/**
 * Devolve {weekday, minutes} (minutos do dia, 0..1440) numa timezone IANA.
 * Usa Intl.DateTimeFormat — sem deps externas.
 */
export function getZonedDayMinutes(
  now: Date,
  timezone: string,
): { weekday: Weekday; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  let dayShort = "Sun";
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "weekday") dayShort = p.value;
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  // en-US: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    dayShort,
  );
  const weekday = WEEKDAY_BY_INDEX[idx >= 0 ? idx : 0] ?? "sun";
  // Em algumas timezones Intl retorna 24:xx pra meia-noite — normaliza.
  const normHour = hour === 24 ? 0 : hour;
  return { weekday, minutes: normHour * 60 + minute };
}
