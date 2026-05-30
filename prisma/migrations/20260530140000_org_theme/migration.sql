-- PBI-30: tema persistido por organização.
-- theme = ThemeId (charcoal | oldschool | viking | salao | manicure | luxe | tattoo)
-- darkMode = override do modo escuro.
-- Cookie continua sobrescrevendo (preview live), default cai pra org.

ALTER TABLE "organizations"
  ADD COLUMN "theme"    TEXT,
  ADD COLUMN "darkMode" BOOLEAN NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON "organizations" TO app_user;
