-- PBI-44: cores customizadas dos appointments por status.
-- Shape JSON: { confirmed, completed, cancelled, noShow } com hex strings.
-- Null = usa defaults do tema corrente.

ALTER TABLE "organizations"
  ADD COLUMN "appointmentColors" JSONB;
