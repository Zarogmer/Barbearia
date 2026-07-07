/**
 * Parser de intents do bot WhatsApp (PBI-60). Client-safe, puro.
 *
 * O bot NÃO interpreta linguagem livre — só keywords exatas (regra do
 * card). Normalização remove acentos/pontuação pra aceitar "cancelar!",
 * "Cancelar" e "CANCELAR" como a mesma coisa.
 */

export type BotIntent =
  | { type: "CANCEL" }
  | { type: "RESCHEDULE" }
  | { type: "CONFIRM_CANCEL" }
  | { type: "YES" }
  | { type: "PICK"; n: number }
  | { type: "HELP" }
  | { type: "UNKNOWN" };

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBotIntent(text: string): BotIntent {
  const t = normalize(text);
  if (!t) return { type: "UNKNOWN" };
  if (t === "SIM CANCELAR") return { type: "CONFIRM_CANCEL" };
  if (t === "SIM") return { type: "YES" };
  if (t === "CANCELAR" || t === "CANCELA") return { type: "CANCEL" };
  if (t === "AGENDAR" || t === "REAGENDAR" || t === "REMARCAR") {
    return { type: "RESCHEDULE" };
  }
  if (/^[1-9]$/.test(t)) return { type: "PICK", n: Number(t) };
  if (t === "AJUDA" || t === "MENU") return { type: "HELP" };
  return { type: "UNKNOWN" };
}
