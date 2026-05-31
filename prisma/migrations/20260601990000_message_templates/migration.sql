-- PBI-31: templates de mensagens pre-definidas pra envio manual
-- via WhatsApp (wa.me link). Sem integracao API Cloud no MVP.

CREATE TABLE "message_templates" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "title"          TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "key"            TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "message_templates_orgId_active_idx"
  ON "message_templates"("organizationId", "active");

ALTER TABLE "message_templates"
  ADD CONSTRAINT "message_templates_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "message_templates"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "message_templates" TO app_user;
