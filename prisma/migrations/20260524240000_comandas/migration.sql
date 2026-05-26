-- Comandas (PBI-21) - PDV/balcao.
-- Comanda = conta aberta com itens (servicos e produtos) + pagamentos
-- (split de metodos possivel). Status OPEN ate fechar com pagamento.

CREATE TYPE "ComandaStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE "ComandaItemType" AS ENUM ('SERVICE', 'PRODUCT');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CREDIT', 'DEBIT', 'CORTESIA');

CREATE TABLE "comandas" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "customerUserId" UUID,
  "customerName"   TEXT NOT NULL,
  "professionalId" UUID NOT NULL,
  "appointmentId"  UUID,
  "status"         "ComandaStatus" NOT NULL DEFAULT 'OPEN',
  "discountCents"  INTEGER NOT NULL DEFAULT 0,
  "notes"          TEXT,
  "openedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"       TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comandas_orgId_status_openedAt_idx" ON "comandas"("organizationId", "status", "openedAt" DESC);
CREATE INDEX "comandas_orgId_customerUserId_idx" ON "comandas"("organizationId", "customerUserId");

ALTER TABLE "comandas"
  ADD CONSTRAINT "comandas_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comandas"
  ADD CONSTRAINT "comandas_discount_nonneg"
  CHECK ("discountCents" >= 0);

-- Items
CREATE TABLE "comanda_items" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "comandaId"      UUID NOT NULL,
  "type"           "ComandaItemType" NOT NULL,
  "refId"          UUID,
  "name"           TEXT NOT NULL,
  "quantity"       INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comanda_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comanda_items_comandaId_idx" ON "comanda_items"("comandaId");

ALTER TABLE "comanda_items"
  ADD CONSTRAINT "comanda_items_comandaId_fkey"
  FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comanda_items"
  ADD CONSTRAINT "comanda_items_qty_pos"
  CHECK ("quantity" > 0);

ALTER TABLE "comanda_items"
  ADD CONSTRAINT "comanda_items_price_nonneg"
  CHECK ("unitPriceCents" >= 0);

-- Payments
CREATE TABLE "comanda_payments" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "comandaId"   UUID NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "method"      "PaymentMethod" NOT NULL,
  "paidAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comanda_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comanda_payments_comandaId_idx" ON "comanda_payments"("comandaId");

ALTER TABLE "comanda_payments"
  ADD CONSTRAINT "comanda_payments_comandaId_fkey"
  FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comanda_payments"
  ADD CONSTRAINT "comanda_payments_amount_pos"
  CHECK ("amountCents" > 0);

-- RLS
-- comandas: organizationId direto
ALTER TABLE "comandas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comandas"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

-- comanda_items: indireto via comanda (sem organizationId direto)
ALTER TABLE "comanda_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comanda_items"
  USING (EXISTS (
    SELECT 1 FROM "comandas" c
    WHERE c.id = "comanda_items"."comandaId"
      AND c."organizationId" = current_org_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "comandas" c
    WHERE c.id = "comanda_items"."comandaId"
      AND c."organizationId" = current_org_id()
  ));

-- comanda_payments: indireto via comanda
ALTER TABLE "comanda_payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comanda_payments"
  USING (EXISTS (
    SELECT 1 FROM "comandas" c
    WHERE c.id = "comanda_payments"."comandaId"
      AND c."organizationId" = current_org_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "comandas" c
    WHERE c.id = "comanda_payments"."comandaId"
      AND c."organizationId" = current_org_id()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "comandas"         TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comanda_items"    TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comanda_payments" TO app_user;
