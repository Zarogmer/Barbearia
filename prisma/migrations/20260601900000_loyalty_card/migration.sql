-- PBI-27: cartão fidelidade por org (stamp card).
-- Contagem = COUNT(appointments status=COMPLETED) por user.
-- Reward é texto livre (admin combina na loja).

ALTER TABLE "organizations"
  ADD COLUMN "loyaltyEnabled"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "loyaltyGoal"        INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "loyaltyRewardLabel" TEXT             DEFAULT 'Corte grátis',
  ADD CONSTRAINT "organizations_loyaltyGoal_range" CHECK ("loyaltyGoal" > 0 AND "loyaltyGoal" <= 100);
