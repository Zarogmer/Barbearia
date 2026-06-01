-- PBI-42: Lançamentos avulsos de receita.

CREATE TABLE "misc_revenues" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "amountCents"    INTEGER NOT NULL,
  "occurredAt"     DATE NOT NULL,
  "paymentMethod"  "PaymentMethod",
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "misc_revenues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "misc_revenues_orgId_date_idx"
  ON "misc_revenues"("organizationId", "occurredAt");

ALTER TABLE "misc_revenues"
  ADD CONSTRAINT "misc_revenues_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "misc_revenues" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "misc_revenues"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "misc_revenues" TO app_user;
