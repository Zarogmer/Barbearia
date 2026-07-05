-- PBI-55: painel super-admin cross-tenant.
--
-- Adiciona:
--   1) User.isSuperAdmin  — flag pra rota /superadmin/*
--   2) Organization.suspendedAt — suspensão manual (bloqueia login dos membros)
--   3) admin_audit_log — toda ação de super-admin logada
--
-- Segurança: admin_audit_log é acessada SÓ via prismaAdmin (bypass RLS).
-- Revogamos permissão do app_user pra dar defesa em profundidade caso
-- alguém acidentalmente importe o client errado numa rota tenant.

ALTER TABLE "users"
  ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "organizations"
  ADD COLUMN "suspendedAt" TIMESTAMP(3);

CREATE INDEX "organizations_suspendedAt_idx" ON "organizations"("suspendedAt");

CREATE TABLE "admin_audit_log" (
  "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId"  UUID           NOT NULL,
  "action"       TEXT           NOT NULL,
  "targetOrgId"  UUID,
  "diff"         JSONB,
  "ip"           TEXT,
  "userAgent"    TEXT,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_audit_log_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "admin_audit_log_targetOrgId_fkey"
    FOREIGN KEY ("targetOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL
);

CREATE INDEX "admin_audit_log_actorUserId_createdAt_idx"
  ON "admin_audit_log"("actorUserId", "createdAt" DESC);
CREATE INDEX "admin_audit_log_targetOrgId_createdAt_idx"
  ON "admin_audit_log"("targetOrgId", "createdAt" DESC);
CREATE INDEX "admin_audit_log_createdAt_idx"
  ON "admin_audit_log"("createdAt" DESC);

-- Defesa em profundidade: app_user (que TODAS as rotas de dono usam) NAO
-- ve nem escreve na tabela. So prismaAdmin (via DIRECT_URL como postgres).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    REVOKE ALL ON "admin_audit_log" FROM "app_user";
  END IF;
END $$;
