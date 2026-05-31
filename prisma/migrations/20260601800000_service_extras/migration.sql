-- PBI-33: extras de servico (category, color, cost, online toggle).

ALTER TABLE "services"
  ADD COLUMN "category"           TEXT,
  ADD COLUMN "color"              TEXT,
  ADD COLUMN "costCents"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "allowOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
  ADD CONSTRAINT "services_costCents_nonneg" CHECK ("costCents" >= 0);

-- Index pra agrupamento por category (usado em filtros/relatorios futuros)
CREATE INDEX "services_orgId_category_idx" ON "services"("organizationId", "category");
