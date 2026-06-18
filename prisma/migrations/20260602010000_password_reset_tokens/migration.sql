-- PBI-50: reset de senha. Token plaintext só existe no email enviado;
-- DB guarda bcrypt(token). userId nullable porque salvamos request mesmo
-- pra email que não existe (anti-enumeration via rate limit).
CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "tokenHash" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "ip" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_email_createdAt_idx" ON "password_reset_tokens"("email", "createdAt");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
