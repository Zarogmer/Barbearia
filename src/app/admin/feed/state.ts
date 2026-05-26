export type PostActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialPostState: PostActionState = {};

export type DeletePostResult = { ok?: boolean; error?: string };
