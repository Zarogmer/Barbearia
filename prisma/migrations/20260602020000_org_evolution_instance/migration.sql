-- PBI-51: cada Organization tem própria instância Evolution. Null = não
-- conectou ainda. Unique pra evitar duas orgs apontando pra mesma sessão.
ALTER TABLE "organizations" ADD COLUMN "evolutionInstance" TEXT;
CREATE UNIQUE INDEX "organizations_evolutionInstance_key" ON "organizations"("evolutionInstance");
