export type NoteActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialNoteState: NoteActionState = {};

export type DeleteNoteResult = { ok?: boolean; error?: string };
