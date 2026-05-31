-- PBI-45: taxas do cartão configuráveis por org.
-- Armazenadas em "basis points × 10" pra suportar 2 decimais.
-- Ex: 4.99% = 499. 0 = sem taxa (default).

ALTER TABLE "organizations"
  ADD COLUMN "creditCardFeeBp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "debitCardFeeBp"  INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "organizations_creditCardFeeBp_range" CHECK ("creditCardFeeBp" >= 0 AND "creditCardFeeBp" <= 5000),
  ADD CONSTRAINT "organizations_debitCardFeeBp_range" CHECK ("debitCardFeeBp" >= 0 AND "debitCardFeeBp" <= 5000);
