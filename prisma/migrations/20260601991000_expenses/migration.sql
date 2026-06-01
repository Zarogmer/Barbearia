-- PBI-36: Despesas. MVP avulso (sem recorrente/parcelado).

CREATE TABLE "expenses" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "amountCents"    INTEGER NOT NULL,
  "expenseDate"    DATE NOT NULL,
  "category"       TEXT,
  "notes"          TEXT,
  "paid"           BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expenses_orgId_date_idx"
  ON "expenses"("organizationId", "expenseDate");
CREATE INDEX "expenses_orgId_paid_idx"
  ON "expenses"("organizationId", "paid");

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "expenses"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "expenses" TO app_user;
