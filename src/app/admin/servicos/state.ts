/**
 * Estado/tipos compartilhados com os client components de serviços.
 * Mantido FORA de actions.ts porque Next 15.5+ exige que arquivos
 * "use server" exportem apenas async functions.
 */
export type ServiceActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type DeactivateResult = {
  ok?: boolean;
  deleted?: boolean;
  error?: string;
};

export const initialServiceState: ServiceActionState = {};
