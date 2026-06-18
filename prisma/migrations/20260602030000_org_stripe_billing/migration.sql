-- PBI-52: Stripe billing por org. Trial original (trialEndsAt) continua
-- válido — Stripe entra só quando dono clica "Assinar". Null em qualquer
-- coluna = ainda não passou pelo checkout.
ALTER TABLE "organizations" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "organizations" ADD COLUMN "subscriptionStatus" TEXT;

CREATE UNIQUE INDEX "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");
CREATE UNIQUE INDEX "organizations_stripeSubscriptionId_key" ON "organizations"("stripeSubscriptionId");
