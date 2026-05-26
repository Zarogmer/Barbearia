-- Add reviews and posts tables (PBI-48 Fases 5 e 6).
-- Both have organizationId + RLS tenant_isolation seguindo padrão das
-- demais tabelas de tenant.

-- ─── Reviews ──────────────────────────────────────────────────
CREATE TABLE "reviews" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "appointmentId"  UUID NOT NULL,
  "rating"         INTEGER NOT NULL,
  "comment"        TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reviews_appointmentId_key" ON "reviews"("appointmentId");
CREATE INDEX "reviews_organizationId_idx" ON "reviews"("organizationId");

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range"
  CHECK ("rating" >= 1 AND "rating" <= 5);

-- ─── Posts ────────────────────────────────────────────────────
CREATE TABLE "posts" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "imageUrl"       TEXT NOT NULL,
  "caption"        TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "posts_organizationId_createdAt_idx" ON "posts"("organizationId", "createdAt" DESC);

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts"   ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "reviews"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

CREATE POLICY tenant_isolation ON "posts"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());

-- Grants para app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON "reviews" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "posts"   TO app_user;
