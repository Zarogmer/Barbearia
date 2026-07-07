-- PBI-60: estado da conversa do bot WhatsApp por (org, phone).

CREATE TYPE "BotStep" AS ENUM ('PICK_APPOINTMENT', 'RESCHEDULE_PICK', 'CANCEL_CONFIRM');

CREATE TABLE "bot_conversations" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "phone"          TEXT NOT NULL,
  "appointmentId"  UUID,
  "step"           "BotStep" NOT NULL,
  "payload"        JSONB,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bot_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_conversations_organizationId_phone_key"
  ON "bot_conversations"("organizationId", "phone");
CREATE INDEX "bot_conversations_expiresAt_idx" ON "bot_conversations"("expiresAt");

ALTER TABLE "bot_conversations"
  ADD CONSTRAINT "bot_conversations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "bot_conversations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bot_conversations"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "bot_conversations" TO app_user;
