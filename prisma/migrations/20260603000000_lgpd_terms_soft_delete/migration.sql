-- PBI-54: LGPD. Timestamp de aceite dos termos no signup + soft delete com
-- grace period de 30 dias (tanto User quanto Organization).
ALTER TABLE "users" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deletionScheduledFor" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "deletionScheduledFor" TIMESTAMP(3);

CREATE INDEX "users_deletionScheduledFor_idx" ON "users"("deletionScheduledFor");
CREATE INDEX "organizations_deletionScheduledFor_idx" ON "organizations"("deletionScheduledFor");
