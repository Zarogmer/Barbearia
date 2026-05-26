export type ReviewActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialReviewState: ReviewActionState = {};
