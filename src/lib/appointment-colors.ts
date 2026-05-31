/**
 * Cores dos appointments por status (PBI-44).
 *
 * Client-safe: tipos + defaults + parser. Server lê do banco e passa
 * pro client component da agenda.
 */

export type AppointmentColors = {
  confirmed: string;
  completed: string;
  cancelled: string;
  noShow: string;
};

export const DEFAULT_APPOINTMENT_COLORS: AppointmentColors = {
  confirmed: "#F1A015", // brand âmbar (charcoal)
  completed: "#1FA463", // verde ok
  cancelled: "#9CA3AF", // cinza muted
  noShow: "#F97316", // laranja warn
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function parseAppointmentColors(raw: unknown): AppointmentColors {
  if (!raw || typeof raw !== "object") return DEFAULT_APPOINTMENT_COLORS;
  const o = raw as Record<string, unknown>;
  return {
    confirmed: isHex(o.confirmed)
      ? o.confirmed
      : DEFAULT_APPOINTMENT_COLORS.confirmed,
    completed: isHex(o.completed)
      ? o.completed
      : DEFAULT_APPOINTMENT_COLORS.completed,
    cancelled: isHex(o.cancelled)
      ? o.cancelled
      : DEFAULT_APPOINTMENT_COLORS.cancelled,
    noShow: isHex(o.noShow) ? o.noShow : DEFAULT_APPOINTMENT_COLORS.noShow,
  };
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX_RE.test(v);
}

/**
 * Resolve cor pra um status. Aceita a forma do enum Prisma (CONFIRMED)
 * ou camelCase (confirmed).
 */
export function colorForStatus(
  colors: AppointmentColors,
  status: string,
): string {
  const k = status.toLowerCase().replace(/_/g, "");
  switch (k) {
    case "confirmed":
      return colors.confirmed;
    case "completed":
      return colors.completed;
    case "cancelled":
      return colors.cancelled;
    case "noshow":
      return colors.noShow;
    default:
      return colors.confirmed;
  }
}

/**
 * Calcula cor de texto (preto/branco) com contraste suficiente sobre
 * uma cor hex. Usa luminância relativa (WCAG). Útil pra appointment
 * block onde a cor de fundo é dinâmica.
 */
export function readableTextColor(hex: string): "#000" | "#fff" {
  if (!HEX_RE.test(hex)) return "#000";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const channel = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return L > 0.5 ? "#000" : "#fff";
}
