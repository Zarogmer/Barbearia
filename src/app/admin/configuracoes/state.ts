export type OrgConfigState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialOrgConfigState: OrgConfigState = {};
