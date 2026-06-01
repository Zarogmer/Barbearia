export type MiscRevenueFormState = {
  ok?: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialMiscRevenueFormState: MiscRevenueFormState = {};

export type MiscRevenueResult = { ok?: boolean; error?: string };
