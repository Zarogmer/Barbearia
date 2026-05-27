export type CommissionActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialCommissionState: CommissionActionState = {};

export type CommissionResult = { ok?: boolean; error?: string };
