export type ExpenseFormState = {
  ok?: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialExpenseFormState: ExpenseFormState = {};

export type ExpenseResult = { ok?: boolean; error?: string };
