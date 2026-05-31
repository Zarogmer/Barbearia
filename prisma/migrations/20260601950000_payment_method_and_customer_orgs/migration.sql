-- PDV: pagamento inline em Appointment + tabela CustomerOrg pra
-- permitir cadastro de cliente sem precisar de agendamento previo.

-- 1) appointments: paymentMethod + paidAt
ALTER TABLE "appointments"
  ADD COLUMN "paymentMethod" "PaymentMethod" NULL,
  ADD COLUMN "paidAt"        TIMESTAMP(3)   NULL;

-- 2) customer_orgs: User x Organization (cliente da org).
-- "booking" = veio de criar agendamento; "import" = import CSV;
-- "manual" = cadastrado avulso no formulario.
CREATE TABLE "customer_orgs" (
  "organizationId" UUID NOT NULL,
  "userId"         UUID NOT NULL,
  "source"         TEXT NOT NULL DEFAULT 'booking',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_orgs_pkey" PRIMARY KEY ("organizationId", "userId")
);

CREATE INDEX "customer_orgs_orgId_idx" ON "customer_orgs"("organizationId");

ALTER TABLE "customer_orgs"
  ADD CONSTRAINT "customer_orgs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_orgs"
  ADD CONSTRAINT "customer_orgs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: todos users que ja tem appointment na org viram CustomerOrg
-- (source='booking' default ja serve)
INSERT INTO "customer_orgs" ("organizationId", "userId", "source")
SELECT DISTINCT "organizationId", "userId", 'booking'
FROM "appointments"
WHERE "userId" IS NOT NULL
ON CONFLICT ("organizationId", "userId") DO NOTHING;

-- RLS
ALTER TABLE "customer_orgs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customer_orgs"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "customer_orgs" TO app_user;
