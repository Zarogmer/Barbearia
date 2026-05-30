import "server-only";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { getSmsProvider } from "./sms";

const TTL_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const PHONE_LIMIT_PER_10MIN = 3;
const IP_LIMIT_PER_HOUR = 10;

export type OtpResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; code: "RATE_LIMIT_PHONE" | "RATE_LIMIT_IP" | "SMS_FAILED"; message: string };

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      code: "NOT_FOUND" | "EXPIRED" | "MAX_ATTEMPTS" | "WRONG_CODE";
      message: string;
      attemptsRemaining?: number;
    };

function generateCode(): string {
  // 6 digitos numericos com leading zero permitido (000000-999999).
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

/**
 * Solicita envio de codigo SMS pra confirmar agendamento.
 * Aplica rate limit por telefone (3/10min) e por IP (10/h).
 * Salva codeHash bcrypt — codigo em claro so existe no SMS.
 */
export async function requestOtp(input: {
  phone: string;
  ip?: string;
}): Promise<OtpResult> {
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60_000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60_000);

  // Rate limit por telefone
  const phoneCount = await prisma.otpToken.count({
    where: { phone: input.phone, createdAt: { gte: tenMinAgo } },
  });
  if (phoneCount >= PHONE_LIMIT_PER_10MIN) {
    return {
      ok: false,
      code: "RATE_LIMIT_PHONE",
      message: "Muitas tentativas pra esse telefone. Aguarde 10 minutos.",
    };
  }

  // Rate limit por IP (se conhecido)
  if (input.ip) {
    const ipCount = await prisma.otpToken.count({
      where: { ip: input.ip, createdAt: { gte: oneHourAgo } },
    });
    if (ipCount >= IP_LIMIT_PER_HOUR) {
      return {
        ok: false,
        code: "RATE_LIMIT_IP",
        message: "Muitas solicitações recentes. Tente novamente daqui a pouco.",
      };
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60_000);

  await prisma.otpToken.create({
    data: {
      phone: input.phone,
      codeHash,
      expiresAt,
      ip: input.ip ?? null,
    },
  });

  try {
    const provider = getSmsProvider();
    await provider.send(
      input.phone,
      `Lustro: seu código de confirmação é ${code}. Válido por ${TTL_MINUTES} minutos.`,
    );
  } catch (err) {
    console.error("SMS send failed:", err);
    return {
      ok: false,
      code: "SMS_FAILED",
      message: "Não foi possível enviar o SMS. Verifique o número e tente outra vez.",
    };
  }

  return { ok: true, expiresAt };
}

/**
 * Verifica codigo digitado. Em sucesso marca consumedAt e retorna OK.
 * Em falha incrementa attempts; chegando em MAX_ATTEMPTS invalida o token.
 */
export async function verifyOtp(input: {
  phone: string;
  code: string;
}): Promise<VerifyResult> {
  const now = new Date();
  const token = await prisma.otpToken.findFirst({
    where: {
      phone: input.phone,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Solicite um novo código.",
    };
  }
  if (token.expiresAt < now) {
    return {
      ok: false,
      code: "EXPIRED",
      message: "Código expirou. Peça um novo.",
    };
  }
  if (token.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      code: "MAX_ATTEMPTS",
      message: "Limite de tentativas atingido. Peça um novo código.",
    };
  }

  const matches = await bcrypt.compare(input.code, token.codeHash);
  if (!matches) {
    const updated = await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    const remaining = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return {
      ok: false,
      code: "WRONG_CODE",
      message: `Código inválido. ${remaining} tentativa${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}.`,
      attemptsRemaining: remaining,
    };
  }

  await prisma.otpToken.update({
    where: { id: token.id },
    data: { consumedAt: now },
  });
  return { ok: true };
}

/** Limpeza de tokens expirados antigos (rodar via cron). */
export async function cleanupExpiredOtps(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
  const r = await prisma.otpToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return r.count;
}
