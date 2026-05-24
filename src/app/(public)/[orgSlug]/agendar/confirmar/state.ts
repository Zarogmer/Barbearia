/**
 * Estado/tipos compartilhados com o ConfirmForm (client).
 * Mantido FORA de actions.ts porque Next 15.5+ exige que arquivos
 * "use server" exportem apenas async functions.
 */
export type ConfirmBookingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialConfirmBookingState: ConfirmBookingState = {};
