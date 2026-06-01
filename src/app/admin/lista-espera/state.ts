export type WaitlistFormState = {
  ok?: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialWaitlistFormState: WaitlistFormState = {};

export type WaitlistResult = { ok?: boolean; error?: string };
