/**
 * Template engine de lembrete (PBI-46). Client-safe.
 *
 * Placeholders aceitos:
 *   {nome}         primeiro nome do cliente
 *   {servico}      nome do serviço
 *   {profissional} primeiro nome do profissional
 *   {data}         data formatada PT-BR ex "sex, 02 jun"
 *   {hora}         hora HH:MM
 *   {barbearia}    nome da organização
 */

export const DEFAULT_REMINDER_TEMPLATE =
  "Oi {nome}! Lembrete: amanhã ({data}) {hora} você tem {servico} com {profissional} na {barbearia}. Cancelar até 2h antes.";

export type ReminderVars = {
  nome: string;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  barbearia: string;
};

const PLACEHOLDER_RE = /\{(nome|servico|profissional|data|hora|barbearia)\}/g;

export function renderReminder(
  templateOrNull: string | null,
  vars: ReminderVars,
): string {
  const tpl = templateOrNull?.trim() || DEFAULT_REMINDER_TEMPLATE;
  return tpl.replace(PLACEHOLDER_RE, (_, key) => {
    const value = vars[key as keyof ReminderVars];
    return value ?? "";
  });
}

/** Pega só o primeiro nome (split no primeiro espaço). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** Lista de placeholders pra mostrar no editor com hint. */
export const REMINDER_PLACEHOLDERS: Array<{ key: string; example: string }> = [
  { key: "{nome}", example: "João" },
  { key: "{servico}", example: "Corte" },
  { key: "{profissional}", example: "Pedro" },
  { key: "{data}", example: "sex, 02 jun" },
  { key: "{hora}", example: "14:30" },
  { key: "{barbearia}", example: "Barbearia Lustro" },
];
