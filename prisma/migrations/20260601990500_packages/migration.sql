-- PBI-26: Pacotes de sessao pre-pagos.
-- Cliente compra N sessoes de 1 servico adiantado, admin consome
-- ao concluir cada appointment correspondente.

CREATE TABLE "packages" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "serviceId"      UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "sessionsCount"  INTEGER NOT NULL,
  "priceCents"     INTEGER NOT NULL,
  "expiresInDays"  INTEGER,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "packages_orgId_active_idx" ON "packages"("organizationId", "active");

ALTER TABLE "packages"
  ADD CONSTRAINT "packages_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "packages"
  ADD CONSTRAINT "packages_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id");

CREATE TABLE "customer_packages" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId"    UUID NOT NULL,
  "packageId"         UUID NOT NULL,
  "customerUserId"    UUID NOT NULL,
  "sessionsRemaining" INTEGER NOT NULL,
  "purchasedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"         TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_packages_orgId_customer_idx" ON "customer_packages"("organizationId", "customerUserId");
CREATE INDEX "customer_packages_orgId_expires_idx" ON "customer_packages"("organizationId", "expiresAt");

ALTER TABLE "customer_packages"
  ADD CONSTRAINT "customer_packages_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_packages"
  ADD CONSTRAINT "customer_packages_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "packages"("id");

-- RLS
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "packages"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "packages" TO app_user;

ALTER TABLE "customer_packages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "customer_packages"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "customer_packages" TO app_user;
