-- PBI-49: trial de 14 dias setado no signup. Null em orgs antigas (criadas
-- via seed ou manualmente), o que isenta elas de bloqueio por billing.
ALTER TABLE "organizations" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
