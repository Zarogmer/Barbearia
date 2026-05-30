-- PBI-18 fase 1: catalogo de produtos + historico de movimentacao.
-- Estoque atual = SUM(quantity assinada por tipo) em InventoryMovement.
-- Permite negativo (RN: vender o que vai chegar amanha).

CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUST');

CREATE TABLE "products" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "sku"            TEXT,
  "description"    TEXT,
  "salePriceCents" INTEGER NOT NULL,
  "costPriceCents" INTEGER NOT NULL DEFAULT 0,
  "minStock"       INTEGER NOT NULL DEFAULT 0,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_orgId_sku_key" ON "products"("organizationId", "sku");
CREATE INDEX "products_orgId_active_idx" ON "products"("organizationId", "active");

ALTER TABLE "products"
  ADD CONSTRAINT "products_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_sale_price_nonneg"
  CHECK ("salePriceCents" >= 0);

ALTER TABLE "products"
  ADD CONSTRAINT "products_cost_price_nonneg"
  CHECK ("costPriceCents" >= 0);

ALTER TABLE "products"
  ADD CONSTRAINT "products_min_stock_nonneg"
  CHECK ("minStock" >= 0);

CREATE TABLE "inventory_movements" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "productId"      UUID NOT NULL,
  "type"           "InventoryMovementType" NOT NULL,
  "quantity"       INTEGER NOT NULL,
  "reason"         TEXT,
  "userId"         UUID,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_movements_orgId_productId_createdAt_idx"
  ON "inventory_movements"("organizationId", "productId", "createdAt" DESC);

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_qty_positive"
  CHECK ("quantity" > 0);

-- RLS: ambos tenant-bound por organizationId direto.
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "products"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventory_movements"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "products"            TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "inventory_movements" TO app_user;
