-- PBI-26: campos de vitrine pública na organização.
-- Tudo opcional pra não quebrar orgs existentes; UI usa fallback gracioso.

ALTER TABLE "organizations"
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "tagline"       TEXT,
  ADD COLUMN "address"       TEXT,
  ADD COLUMN "instagram"     TEXT,
  ADD COLUMN "whatsapp"      TEXT,
  ADD COLUMN "businessHours" JSONB;

-- RLS continua valendo (policy tenant_isolation criada no init).
-- GRANT é por tabela, não por coluna — re-emite no role app_user pra
-- garantir UPDATE em colunas novas (defensivo; geralmente herdado).
GRANT SELECT, INSERT, UPDATE, DELETE ON "organizations" TO app_user;
