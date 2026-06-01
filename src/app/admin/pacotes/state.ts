export type PackageFormState = {
  ok?: boolean;
  packageId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialPackageFormState: PackageFormState = {};

export type PackageResult = { ok?: boolean; error?: string };
