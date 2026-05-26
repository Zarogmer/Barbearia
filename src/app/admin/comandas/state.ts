export type ComandaActionState = {
  ok?: boolean;
  comandaId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialComandaActionState: ComandaActionState = {};

export type ComandaResult = { ok?: boolean; error?: string };
