export type ProfileActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialProfileState: ProfileActionState = {};
