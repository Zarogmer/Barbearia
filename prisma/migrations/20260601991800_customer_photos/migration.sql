-- PBI-38: Fotos do cliente (antes/depois/inspiracao).

CREATE TYPE "PhotoTag" AS ENUM (
  'BEFORE',
  'AFTER',
  'INSPIRATION',
  'OTHER'
);

CREATE TABLE "customer_photos" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "customerUserId" UUID NOT NULL,
  "url"            TEXT NOT NULL,
  "tag"            "PhotoTag" NOT NULL DEFAULT 'OTHER',
  "caption"        TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_photos_orgId_customer_created_idx"
  ON "customer_photos"("organizationId", "customerUserId", "createdAt" DESC);

ALTER TABLE "customer_photos"
  ADD CONSTRAINT "customer_photos_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "customer_photos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "customer_photos"
  USING ("organizationId" = current_org_id())
  WITH CHECK ("organizationId" = current_org_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON "customer_photos" TO app_user;
