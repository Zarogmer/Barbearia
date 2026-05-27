-- Comissoes (PBI-22).
-- CommissionRule: percentual de comissao por (professional, service?).
--   serviceId NULL = regra default do profissional.
-- CommissionPayment: registro de pagamento de comissao por periodo.

CREATE TABLE "commission_rules" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "professionalId" UUID NOT NULL,
  "serviceId"      UUID,
  "percent"        INTEGER NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commission_rules_prof_service_unique"
  ON "commission_rules"("professionalId", COALESCE("serviceId", '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX "commission_rules_orgId_idx" ON "commission_rules"("organizationId");

ALTER TABLE "commission_rules"
  ADD CONSTRAINT "commission_rules_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_rules"
  ADD CONSTRAINT "commission_rules_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_rules"
  ADD CONSTRAINT "commission_rules_percent_range"
  CHECK ("percent" >= 0 AND "percent" <= 100);

-- Payments
CREATE TABLE "commission_payments" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId"       UUID NOT NULL,
  "professionalId"       UUID NOT NULL,
  "periodStart"          TIMESTAMP(3) NOT NULL,
  "periodEnd"            TIMESTAMP(3) NOT NULL,
  "totalGrossCents"      INTEGER NOT NULL,
  "totalCommissionCents" INTEGER NOT NULL,
  "notes"                TEXT,
  "paidAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commission_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commission_payments_orgId_profId_paidAt_idx"
  ON "commission_payments"("organizationId", "professionalId", "paidAt" DESC);

ALTER TABLE "commission_payments"
  ADD CONSTRAINT "commission_payments_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_payments"
  ADD CONSTRAINT "commission_payments_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "professionals"("id");

ALTER TABLE "commission_payments"
  ADD CONSTRAINT "commission_payments_period_order"
  CHECK ("periodStart" <= "periodEnd");

-- RLS
ALTER TABLE "commission_rules"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "commission_rules"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON "commission_payments"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "commission_rules"    TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "commission_payments" TO app_user;
