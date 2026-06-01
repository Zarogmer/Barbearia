-- PBI-40: Lista de espera. Cliente que quer atender mas nao tem slot
-- vai pra fila. Admin notifica manualmente quando libera horario.

CREATE TYPE "WaitlistStatus" AS ENUM (
  'WAITING',
  'NOTIFIED',
  'SCHEDULED',
  'EXPIRED'
);

CREATE TABLE "waitlist" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId"     UUID NOT NULL,
  "customerUserId"     UUID,
  "customerName"       TEXT NOT NULL,
  "customerPhone"      TEXT,
  "serviceId"          UUID NOT NULL,
  "professionalId"     UUID,
  "preferredDateStart" DATE NOT NULL,
  "preferredDateEnd"   DATE NOT NULL,
  "status"             "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "notifiedAt"         TIMESTAMP(3),
  "notes"              TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "waitlist_orgId_status_dateStart_idx"
  ON "waitlist"("organizationId", "status", "preferredDateStart");

CREATE INDEX "waitlist_orgId_serviceId_status_idx"
  ON "waitlist"("organizationId", "serviceId", "status");

ALTER TABLE "waitlist"
  ADD CONSTRAINT "waitlist_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waitlist"
  ADD CONSTRAINT "waitlist_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id");

ALTER TABLE "waitlist"
  ADD CONSTRAINT "waitlist_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "professionals"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "waitlist"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "waitlist" TO app_user;
