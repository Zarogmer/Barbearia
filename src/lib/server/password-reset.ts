import "server-only";

import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { prismaAdmin } from "@/lib/db";

const TTL_MINUTES = 60;
const SECRET_BYTES = 32; // 64 hex chars — entropia >> attack budget
const EMAIL_LIMIT_PER_HOUR = 3;
const IP_LIMIT_PER_HOUR = 10;
const MIN_PASSWORD_LENGTH = 8;

export type RequestResetResult =
  | { ok: true; tokenForEmail: string | null; userEmail: string | null }
  | {
      ok: false;
      code: "RATE_LIMIT_EMAIL" | "RATE_LIMIT_IP";
      message: string;
    };

export type ResetPasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_TOKEN" | "EXPIRED" | "ALREADY_USED" | "WEAK_PASSWORD";
      message: string;
    };

/**
 * Etapa 1 — recebe email, gera token, registra row e (se user existir)
 * devolve o token plaintext pro caller mandar email. Sempre retorna ok
 * pra não vazar se o email existe (anti-enumeration).
 *
 * Token formato: `${rowId}.${secret}`. rowId vira chave de lookup direta
 * no verify (sem precisar scan por bcrypt-compare em todos os tokens).
 * Só o secret é hasheado no DB.
 */
export async function requestPasswordReset(input: {
  email: string;
  ip?: string;
}): Promise<RequestResetResult> {
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Rate limit por email (3/h)
  const emailCount = await prismaAdmin.passwordResetToken.count({
    where: { email, createdAt: { gte: oneHourAgo } },
  });
  if (emailCount >= EMAIL_LIMIT_PER_HOUR) {
    return {
      ok: false,
      code: "RATE_LIMIT_EMAIL",
      message: "Muitas tentativas pra esse email. Aguarde 1 hora.",
    };
  }

  // Rate limit por IP (10/h)
  if (input.ip) {
    const ipCount = await prismaAdmin.passwordResetToken.count({
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

  // Procura user. Se não existir, ainda assim cria row pro rate limit
  // contabilizar — protege contra enumeration via timing.
  const user = await prismaAdmin.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  const secret = randomBytes(SECRET_BYTES).toString("hex");
  const secretHash = await bcrypt.hash(secret, 10);
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60_000);

  const row = await prismaAdmin.passwordResetToken.create({
    data: {
      userId: user?.id ?? null,
      tokenHash: secretHash,
      email,
      ip: input.ip ?? null,
      expiresAt,
    },
    select: { id: true },
  });

  // Se user não existir, nada de email — mas devolvemos ok=true mesmo
  // assim. Atacante não sabe se email existe.
  if (!user) {
    return { ok: true, tokenForEmail: null, userEmail: null };
  }

  return {
    ok: true,
    tokenForEmail: `${row.id}.${secret}`,
    userEmail: user.email,
  };
}

/**
 * Etapa 2 — verifica o token e troca a senha. Token formato `<id>.<secret>`.
 * Lookup direto pelo id (UUID), bcrypt-compare do secret. Marca consumedAt
 * pra impedir reuse.
 */
export async function verifyAndResetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<ResetPasswordResult> {
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: `Senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  const [rowId, secret] = input.token.split(".");
  if (!rowId || !secret) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "Link inválido. Solicite um novo.",
    };
  }

  // UUID check defensivo — query falha se rowId não for UUID válido.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rowId,
    );
  if (!isUuid) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "Link inválido. Solicite um novo.",
    };
  }

  const row = await prismaAdmin.passwordResetToken.findUnique({
    where: { id: rowId },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!row || !row.userId) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "Link inválido. Solicite um novo.",
    };
  }
  if (row.consumedAt) {
    return {
      ok: false,
      code: "ALREADY_USED",
      message: "Esse link já foi usado. Solicite um novo se precisar.",
    };
  }
  if (row.expiresAt < new Date()) {
    return {
      ok: false,
      code: "EXPIRED",
      message: "Link expirou. Solicite um novo.",
    };
  }

  const matches = await bcrypt.compare(secret, row.tokenHash);
  if (!matches) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "Link inválido. Solicite um novo.",
    };
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
  await prismaAdmin.$transaction([
    prismaAdmin.user.update({
      where: { id: row.userId },
      data: { passwordHash: newPasswordHash },
    }),
    prismaAdmin.passwordResetToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
    // Bonus: invalida outros tokens pendentes do mesmo user pra evitar
    // reuse de links antigos que ainda estão em pé.
    prismaAdmin.passwordResetToken.updateMany({
      where: {
        userId: row.userId,
        consumedAt: null,
        id: { not: row.id },
      },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

/** Limpeza periódica de tokens expirados (rodar via cron). */
export async function cleanupExpiredResetTokens(
  olderThanHours = 24,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
  const r = await prismaAdmin.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return r.count;
}
