-- Bot de WhatsApp (@zarogmer/whatsapp): cooldown de auto-resposta.
-- Evita spammar quem manda varias mensagens seguidas e absorve os webhooks
-- duplicados do Evolution (ele re-entrega o mesmo evento). Claim atomico:
-- UPDATE condicional (sentAt < cutoff) + INSERT ON CONFLICT DO NOTHING.
-- Cross-tenant, sem RLS — so o webhook (server-side) escreve.

CREATE TABLE "whatsapp_autoreply_cooldown" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "phone"          TEXT NOT NULL,
  "ruleId"         TEXT NOT NULL,
  "sentAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_autoreply_cooldown_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_autoreply_cooldown_org_phone_rule_key"
  ON "whatsapp_autoreply_cooldown"("organizationId", "phone", "ruleId");
CREATE INDEX "whatsapp_autoreply_cooldown_sentAt_idx"
  ON "whatsapp_autoreply_cooldown"("sentAt");

GRANT SELECT, INSERT, UPDATE, DELETE ON "whatsapp_autoreply_cooldown" TO app_user;
