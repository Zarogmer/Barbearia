-- PBI-28: aniversariantes — adiciona birthDate em User pra CRM
-- proativo. Só mês+dia relevantes, mas guardamos data completa.

ALTER TABLE "users"
  ADD COLUMN "birthDate" DATE;

-- Index pra query de aniversariantes (extract month/day).
-- Postgres não tem index funcional direto em date_part, mas vamos
-- depender de seq scan sobre users — orgs pequenas, irrelevante.
