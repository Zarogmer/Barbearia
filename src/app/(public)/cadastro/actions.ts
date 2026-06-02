"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prismaAdmin } from "@/lib/db";
import { requestOtp, verifyOtp } from "@/lib/server/otp";
import {
  requestSignupSchema,
  verifySignupSchema,
} from "@/lib/validators/auth";

import type { SignupState } from "./state";

function fieldErrorsFrom(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path[0]?.toString();
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}

/**
 * Etapa 1 — coleta dados, valida unicidade de email/telefone, dispara OTP
 * por WhatsApp. Pré-hasheia a senha pra não precisar guardar plaintext no
 * state entre etapas.
 */
export async function requestSignupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    acceptedTerms: formData.get("acceptedTerms")?.toString() ?? "",
  };

  const parsed = requestSignupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      step: "request",
      error: "Confira os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
      values: { name: raw.name, email: raw.email, phone: raw.phone },
    };
  }
  const { name, email, phone, password } = parsed.data;

  const [emailTaken, phoneTaken] = await Promise.all([
    prismaAdmin.user.findUnique({
      where: { email },
      select: { id: true },
    }),
    prismaAdmin.user.findFirst({
      where: { phone },
      select: { id: true },
    }),
  ]);
  if (emailTaken) {
    return {
      step: "request",
      error: "Já existe conta com esse email.",
      fieldErrors: { email: "Email já cadastrado" },
      values: { name, email, phone },
    };
  }
  if (phoneTaken) {
    return {
      step: "request",
      error: "Já existe conta com esse telefone.",
      fieldErrors: { phone: "Telefone já cadastrado" },
      values: { name, email, phone },
    };
  }

  const ip = await clientIp();
  const otp = await requestOtp({ phone, ip });
  if (!otp.ok) {
    return {
      step: "request",
      error: otp.message,
      values: { name, email, phone },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return {
    step: "verify",
    name,
    email,
    phone,
    passwordHash,
  };
}

/**
 * Etapa 2 — verifica código e cria User. passwordHash veio via hidden input
 * pra não trafegar plaintext entre etapas.
 */
export async function verifySignupAction(
  prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const prevVerify = prev.step === "verify" ? prev : null;

  const raw = {
    name: prevVerify?.name ?? formData.get("name")?.toString() ?? "",
    email: prevVerify?.email ?? formData.get("email")?.toString() ?? "",
    phone: prevVerify?.phone ?? formData.get("phone")?.toString() ?? "",
    passwordHash:
      prevVerify?.passwordHash ??
      formData.get("passwordHash")?.toString() ??
      "",
    code: formData.get("code")?.toString() ?? "",
  };

  const parsed = verifySignupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      step: "verify",
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      passwordHash: raw.passwordHash,
      error: "Confira o código.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const data = parsed.data;

  const verification = await verifyOtp({ phone: data.phone, code: data.code });
  if (!verification.ok) {
    return {
      step: "verify",
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      error: verification.message,
      attemptsRemaining:
        verification.code === "WRONG_CODE"
          ? verification.attemptsRemaining
          : undefined,
    };
  }

  // Race-check: outro signup pode ter consumido email/telefone entre etapa 1
  // e 2. Re-valida antes de inserir.
  const [emailTaken, phoneTaken] = await Promise.all([
    prismaAdmin.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
    prismaAdmin.user.findFirst({
      where: { phone: data.phone },
      select: { id: true },
    }),
  ]);
  if (emailTaken || phoneTaken) {
    return {
      step: "request",
      error: emailTaken
        ? "Email já cadastrado durante a verificação."
        : "Telefone já cadastrado durante a verificação.",
    };
  }

  await prismaAdmin.user.create({
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      passwordHash: data.passwordHash,
    },
  });

  redirect("/login?signup=ok");
}

/**
 * Reenvio de OTP na etapa 2. Usa o telefone do state da verify — rate limit
 * do requestOtp protege contra abuso. Retorna void: cliente só usa pra
 * disparar novo SMS, feedback fica no badge de cooldown.
 */
export async function resendSignupOtpAction(phone: string): Promise<void> {
  if (!phone || !phone.startsWith("+")) return;
  const ip = await clientIp();
  await requestOtp({ phone, ip });
}
