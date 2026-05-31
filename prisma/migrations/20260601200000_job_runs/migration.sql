-- Self-trigger do job diário de notificações. Registra última
-- execução pra evitar duplicar quando múltiplos admins abrirem
-- o painel no mesmo dia.

CREATE TABLE "job_runs" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"       TEXT NOT NULL,
  "startedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "result"     JSONB,
  CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_runs_name_startedAt_idx" ON "job_runs"("name", "startedAt" DESC);

-- Sem RLS — tabela global (não tem organizationId).
-- Acesso via prismaAdmin apenas.
GRANT SELECT, INSERT, UPDATE ON "job_runs" TO app_user;
