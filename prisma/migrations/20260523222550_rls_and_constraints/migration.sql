-- Multi-tenant isolation via RLS + anti-overlap appointment constraint.
-- Roles (app_user, app_migrator) are created out-of-band by prisma/setup-app-user.ts
-- so the password isn't hard-coded in this migration.

-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── Tenant context helper ────────────────────────────────────
-- Reads the current org from a session-local setting. Returns NULL when unset
-- so RLS policies naturally reject every row (queries return zero rows).
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- ─── Enable RLS on all tenant tables ──────────────────────────
ALTER TABLE organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE services              ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours         ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;

-- ─── Policies ─────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON memberships
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON services
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON professionals
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON working_hours
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON time_blocks
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON appointments
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

-- professional_services is a join table without organizationId; isolate
-- transitively through services/professionals (both rows must be visible).
CREATE POLICY tenant_isolation ON professional_services
  USING (
    EXISTS (SELECT 1 FROM services      s WHERE s.id = "serviceId"      AND s."organizationId" = current_org_id())
    AND
    EXISTS (SELECT 1 FROM professionals p WHERE p.id = "professionalId" AND p."organizationId" = current_org_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM services      s WHERE s.id = "serviceId"      AND s."organizationId" = current_org_id())
    AND
    EXISTS (SELECT 1 FROM professionals p WHERE p.id = "professionalId" AND p."organizationId" = current_org_id())
  );

-- organizations: each tenant sees only their own row.
CREATE POLICY self_only ON organizations
  USING (id = current_org_id())
  WITH CHECK (id = current_org_id());

-- ─── Force RLS for table owner ────────────────────────────────
-- Without FORCE, the table owner bypasses RLS. We want app_user (which
-- inherits from the migrator that owns the tables) to obey policy.
ALTER TABLE organizations         FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships           FORCE ROW LEVEL SECURITY;
ALTER TABLE services              FORCE ROW LEVEL SECURITY;
ALTER TABLE professionals         FORCE ROW LEVEL SECURITY;
ALTER TABLE professional_services FORCE ROW LEVEL SECURITY;
ALTER TABLE working_hours         FORCE ROW LEVEL SECURITY;
ALTER TABLE time_blocks           FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments          FORCE ROW LEVEL SECURITY;

-- ─── Anti-overlap appointment constraint ──────────────────────
-- Prevents two CONFIRMED appointments for the same professional from overlapping.
-- Postgres 18 rejects tstzrange / "AT TIME ZONE" inside index expressions because
-- they are STABLE (timezone-dependent), not IMMUTABLE. EXTRACT(EPOCH FROM ts)
-- returns seconds since epoch (timezone-independent) and is truly IMMUTABLE, so
-- we compare via int8range — semantically identical for overlap detection.
-- Range '[)' = closed-open: an appointment ending at 10:00 doesn't collide
-- with one starting at exactly 10:00.
ALTER TABLE appointments
  ADD CONSTRAINT no_overlap_per_professional
  EXCLUDE USING gist (
    "professionalId" WITH =,
    int8range(
      EXTRACT(EPOCH FROM "startsAt")::bigint,
      EXTRACT(EPOCH FROM "endsAt")::bigint,
      '[)'
    ) WITH &&
  )
  WHERE (status = 'CONFIRMED');
