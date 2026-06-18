"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prismaAdmin } from "@/lib/db";
import { requestOtp, verifyOtp } from "@/lib/server/otp";
import {
  createOrgSchema,
  requestSignupSchema,
  verifySignupSchema,
} from "@/lib/validators/auth";

import type { SignupState } from "./state";

const TRIAL_DAYS = 14;

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

  // OTP consumido pelo verifyOtp. Avança pra etapa 3: criar Organization.
  // NÃO cria o User aqui — só depois que o dono escolher nome+slug da org,
  // criamos tudo em transação única.
  return {
    step: "org",
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: data.passwordHash,
  };
}

/**
 * Etapa 3 — recebe nome + slug da barbearia e cria User + Organization +
 * Membership(OWNER) numa transação única. Trial de 14 dias começa aqui.
 * Logo após, faz login automático e redireciona pro painel.
 */
export async function createOrgAction(
  prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const prevOrg = prev.step === "org" ? prev : null;

  const raw = {
    name: prevOrg?.name ?? formData.get("name")?.toString() ?? "",
    email: prevOrg?.email ?? formData.get("email")?.toString() ?? "",
    phone: prevOrg?.phone ?? formData.get("phone")?.toString() ?? "",
    passwordHash:
      prevOrg?.passwordHash ?? formData.get("passwordHash")?.toString() ?? "",
    orgName: formData.get("orgName")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
  };

  const parsed = createOrgSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      step: "org",
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      passwordHash: raw.passwordHash,
      error: "Confira os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
      values: { orgName: raw.orgName, slug: raw.slug },
    };
  }
  const data = parsed.data;

  // Race-check: alguém pode ter pegado email/telefone/slug enquanto o dono
  // ainda escolhia o nome da barbearia.
  const [emailTaken, phoneTaken, slugTaken] = await Promise.all([
    prismaAdmin.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
    prismaAdmin.user.findFirst({
      where: { phone: data.phone },
      select: { id: true },
    }),
    prismaAdmin.organization.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    }),
  ]);
  if (emailTaken || phoneTaken) {
    return {
      step: "request",
      error: emailTaken
        ? "Email já cadastrado. Tente entrar."
        : "Telefone já cadastrado. Tente entrar.",
    };
  }
  if (slugTaken) {
    return {
      step: "org",
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      error: "Esse endereço já está em uso.",
      fieldErrors: { slug: "Já existe uma barbearia com esse endereço" },
      values: { orgName: data.orgName, slug: data.slug },
    };
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  // Tudo numa tx única: User + Organization + Membership(OWNER). Se qualquer
  // passo falhar, nada é persistido — dono pode tentar de novo sem deixar
  // User órfão sem Org ou Org sem dono.
  await prismaAdmin.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        passwordHash: data.passwordHash,
      },
      select: { id: true },
    });
    const org = await tx.organization.create({
      data: {
        slug: data.slug,
        name: data.orgName,
        trialEndsAt,
      },
      select: { id: true },
    });
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });
  });

  // Não dá pra auto-login: credentials provider precisa do plaintext da
  // senha, e a essa altura só temos o hash. Levamos pro /login com hint
  // pra UX explicar "conta criada, faça login".
  redirect(`/login?signup=ok&email=${encodeURIComponent(data.email)}`);
}

/**
 * Reenvio de OTP na etapa 2. Usa o telefone do state da verify — rate limit
 * do requestOtp protege contra abuso. Retorna void: cliente só usa pra
 * disparar novo WhatsApp, feedback fica no badge de cooldown.
 */
export async function resendSignupOtpAction(phone: string): Promise<void> {
  if (!phone || !phone.startsWith("+")) return;
  const ip = await clientIp();
  await requestOtp({ phone, ip });
}
