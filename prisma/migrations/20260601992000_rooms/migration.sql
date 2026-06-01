-- PBI-41: Salas/cadeiras. Posto de trabalho fisico opcional.

CREATE TABLE "rooms" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rooms_orgId_active_idx" ON "rooms"("organizationId", "active");

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Appointment.roomId opcional (sem hook automatico no slot calc no MVP)
ALTER TABLE "appointments" ADD COLUMN "roomId" UUID;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rooms"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "rooms" TO app_user;
