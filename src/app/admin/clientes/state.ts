export type NoteActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialNoteState: NoteActionState = {};

export type DeleteNoteResult = { ok?: boolean; error?: string };

export type CreateCustomerState = {
  ok?: boolean;
  userId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialCreateCustomerState: CreateCustomerState = {};
