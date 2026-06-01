-- PBI-39: Orçamentos. Lista de servicos/produtos cotada antes de
-- virar atendimento real. MVP sem PDF — share via wa.me text.

CREATE TYPE "QuoteStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'EXPIRED'
);

CREATE TYPE "QuoteItemType" AS ENUM (
  'SERVICE',
  'PRODUCT',
  'MANUAL'
);

CREATE TABLE "quotes" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "customerUserId" UUID,
  "customerName"   TEXT NOT NULL,
  "customerPhone"  TEXT,
  "status"         "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "expiresAt"      DATE,
  "discountCents"  INTEGER NOT NULL DEFAULT 0,
  "totalCents"     INTEGER NOT NULL DEFAULT 0,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotes_orgId_status_created_idx" ON "quotes"("organizationId", "status", "createdAt");
CREATE INDEX "quotes_orgId_customer_idx" ON "quotes"("organizationId", "customerUserId");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "quote_items" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId"        UUID NOT NULL,
  "type"           "QuoteItemType" NOT NULL,
  "refId"          UUID,
  "name"           TEXT NOT NULL,
  "quantity"       INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL,
  CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");

ALTER TABLE "quote_items"
  ADD CONSTRAINT "quote_items_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "quotes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS quotes (com tenant). quote_items via cascade do quote.
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "quotes"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "quotes" TO app_user;

-- quote_items: nao tem orgId direto, RLS via JOIN ao quote. Mas em RLS
-- pesa muito JOIN, entao nao usa RLS aqui — cuidado: server-side sempre
-- filtra via quote.organizationId. GRANT necessario.
GRANT SELECT, INSERT, UPDATE, DELETE ON "quote_items" TO app_user;
