/**
 * Estado/tipos compartilhados com os client components da agenda admin.
 * Mantido FORA de actions.ts porque Next 15.5+ exige que arquivos
 * "use server" exportem apenas async functions.
 */
export type AdminAgendaActionResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialAgendaActionState: AdminAgendaActionResult = {};
