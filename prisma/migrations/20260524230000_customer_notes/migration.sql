-- Notas internas do admin sobre clientes (PBI-20 CRM).
-- Sao "post-its" do dono/staff sobre o cliente — preferencias,
-- alergias, observacoes pos-atendimento. Nao visivel ao cliente.

CREATE TABLE "customer_notes" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId"  UUID NOT NULL,
  "customerUserId"  UUID NOT NULL,
  "body"            TEXT NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_notes_orgId_customerUserId_createdAt_idx"
  ON "customer_notes"("organizationId", "customerUserId", "createdAt" DESC);

ALTER TABLE "customer_notes"
  ADD CONSTRAINT "customer_notes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "customer_notes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customer_notes"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "customer_notes" TO app_user;
