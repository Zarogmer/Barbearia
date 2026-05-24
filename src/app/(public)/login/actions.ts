"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";

export type LoginActionResult = { error: string } | undefined;

export async function loginAction(
  _prev: LoginActionResult,
  formData: FormData,
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const next = formData.get("next");
  const redirectTo = typeof next === "string" && next.startsWith("/") ? next : "/admin/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: true,
      redirectTo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email ou senha incorretos" };
    }
    // signIn lança NEXT_REDIRECT em caso de sucesso — re-throw é obrigatório.
    throw e;
  }
}
