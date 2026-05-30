-- OtpToken (PBI-23) — confirmacao de agendamento anonimo por SMS.
-- Cross-tenant: telefone e global. Sem RLS — acesso controlado pelo
-- Server Action + rate limit por phone+ip.

CREATE TABLE "otp_tokens" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "phone"      TEXT NOT NULL,
  "codeHash"   TEXT NOT NULL,
  "attempts"   INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "ip"         TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_tokens_phone_createdAt_idx" ON "otp_tokens"("phone", "createdAt" DESC);
CREATE INDEX "otp_tokens_expiresAt_idx" ON "otp_tokens"("expiresAt");

GRANT SELECT, INSERT, UPDATE, DELETE ON "otp_tokens" TO app_user;
