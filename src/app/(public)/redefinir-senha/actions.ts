"use server";

import { redirect } from "next/navigation";

import { verifyAndResetPassword } from "@/lib/server/password-reset";
import { resetPasswordSchema } from "@/lib/validators/auth";

export type ResetPasswordState =
  | { status: "idle" }
  | {
      status: "error";
      error: string;
      fieldErrors?: Record<string, string>;
    };

export const initialResetPasswordState: ResetPasswordState = { status: "idle" };

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  });
  if (!parsed.success) {
    const errs: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0]?.toString();
      if (k && !errs[k]) errs[k] = i.message;
    }
    return {
      status: "error",
      error: "Confira os campos destacados.",
      fieldErrors: errs,
    };
  }

  const r = await verifyAndResetPassword({
    token: parsed.data.token,
    newPassword: parsed.data.password,
  });
  if (!r.ok) {
    return { status: "error", error: r.message };
  }

  redirect("/login?reset=ok");
}
