import "server-only";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaAdmin: PrismaClient | undefined;
}

/**
 * Cliente PADRÃO da aplicação. Conecta como `app_user` (RLS forçado).
 * Toda query precisa rodar dentro de `withTenant(orgId)` ou retorna 0 linhas.
 */
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

/**
 * Cliente ADMIN (bypass RLS, conecta como `postgres` via DIRECT_URL).
 *
 * Uso restrito a operações sem contexto de tenant:
 *  - identidade global (User, Account, Session, VerificationToken)
 *  - resolução de orgSlug → Organization.id (antes do tenant context existir)
 *  - super-admin (não há no MVP)
 *
 * NUNCA usar pra queries de dados de tenant — burla RLS e vaza cross-tenant.
 */
export const prismaAdmin =
  global.__prismaAdmin ??
  new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
  global.__prismaAdmin = prismaAdmin;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Roda `fn` numa transação com `app.current_org_id` setado, ativando RLS no
 * Postgres como ÚLTIMA linha de defesa contra vazamento cross-tenant.
 *
 * Toda função em `src/lib/server/*` que toca tabelas multi-tenant precisa
 * passar por aqui. O `organizationId` vem da sessão do usuário — nunca
 * confie em ID enviado pelo client.
 */
export async function withTenant<T>(
  organizationId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(organizationId)) {
    throw new Error("withTenant: organizationId precisa ser UUID válido");
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${organizationId}'`);
    return fn(tx as unknown as PrismaClient);
  });
}
