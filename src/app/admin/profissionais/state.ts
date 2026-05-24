/**
 * Estado/tipos compartilhados com client components de profissionais.
 * Fora de actions.ts porque Next 15.5+ "use server" só exporta async.
 */
export type ProfessionalActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  createdId?: string;
};

export const initialProfessionalState: ProfessionalActionState = {};

export type WorkingHoursActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialWorkingHoursState: WorkingHoursActionState = {};

export type TimeBlockActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  conflictAppointmentIds?: string[];
};

export const initialTimeBlockState: TimeBlockActionState = {};
