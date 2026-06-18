"use server";

import { headers } from "next/headers";

import {
  requestPasswordReset,
} from "@/lib/server/password-reset";
import { sendPasswordResetEmail } from "@/lib/server/email/password-reset";
import { prismaAdmin } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validators/auth";

export type ForgotPasswordState =
  | { status: "idle" }
  | { status: "error"; error: string; fieldErrors?: Record<string, string> }
  | { status: "sent" };

export const initialForgotPasswordState: ForgotPasswordState = {
  status: "idle",
};

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}

const TTL_MINUTES = 60;

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: "Email inválido.",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "Inválido" },
    };
  }

  const ip = await clientIp();
  const result = await requestPasswordReset({ email: parsed.data.email, ip });

  // Rate limit — também mostra mensagem de sucesso pra não vazar timing.
  // Mas aqui devolvemos erro mesmo, porque a UI já mostrou o estado e
  // queremos guiar o usuário ("aguarde 1h" é honesto).
  if (!result.ok) {
    return { status: "error", error: result.message };
  }

  // Só dispara email se user existe (tokenForEmail != null). Caso contrario
  // ainda assim retornamos "sent" pra não vazar enumeração.
  if (result.tokenForEmail && result.userEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/redefinir-senha?token=${encodeURIComponent(result.tokenForEmail)}`;
    // Pega nome do user pra personalizar (não bloqueia se falhar).
    const user = await prismaAdmin.user.findUnique({
      where: { email: result.userEmail },
      select: { name: true },
    });
    try {
      await sendPasswordResetEmail({
        toEmail: result.userEmail,
        userName: user?.name ?? "",
        resetUrl,
        expiresInMinutes: TTL_MINUTES,
      });
    } catch (err) {
      console.error("sendPasswordResetEmail failed (non-fatal):", err);
      // Email falhou mas user vê sucesso — comportamento aceitavel pra
      // anti-enumeration. Cron de reenvio futuro pode pegar.
    }
  }

  return { status: "sent" };
}
