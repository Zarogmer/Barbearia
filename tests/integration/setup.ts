/**
 * Helpers de fixture pra integration tests. Cada teste cria sua própria
 * org com slug aleatório pra isolar de testes paralelos. RLS é forçado
 * pelo cliente `appPrisma` (não-admin), bypass disponível via
 * `adminPrisma`.
 *
 * Usage:
 *   import { createTestOrg, appPrisma, adminPrisma, withTenantCtx } from "./setup";
 *
 *   const { org, owner, service, professional } = await createTestOrg("acme");
 *   await withTenantCtx(org.id, async (db) => {
 *     // ... queries com RLS forçando current_org_id
 *   });
 */
import { PrismaClient } from "@prisma/client";

const DB_URL = process.env.DATABASE_URL;
const APP_USER_PASSWORD = process.env.APP_USER_PASSWORD;

if (!DB_URL) {
  throw new Error(
    "DATABASE_URL não setado. Rode com `pnpm test:integration` " +
      "(usa .env.test) ou exporte manualmente apontando pro Postgres de teste.",
  );
}
if (!APP_USER_PASSWORD) {
  throw new Error(
    "APP_USER_PASSWORD não setado. Necessário pra simular RLS em integration " +
      "tests (cliente app_user com NOBYPASSRLS). Ver .env.test.",
  );
}

/**
 * Substitui o user/senha numa URL de conexão Postgres mantendo host/db/params.
 * Usado pra derivar a URL de `app_user` a partir da `DATABASE_URL` de teste
 * (que conecta como `postgres` superuser pra fixtures).
 */
function rewriteCredentials(url: string, user: string, password: string): string {
  // postgresql://USER:PASS@host:port/db?params
  return url.replace(
    /^(postgres(?:ql)?:\/\/)[^:]+:[^@]+@/,
    `$1${user}:${encodeURIComponent(password)}@`,
  );
}

const APP_USER_URL = rewriteCredentials(DB_URL, "app_user", APP_USER_PASSWORD);

/**
 * Cliente "admin" (bypass RLS). Conecta como `postgres` superuser pra
 * setup de fixtures e cleanup. Postgres faz superusers ignorarem RLS por
 * default, então NÃO use isso pra testar isolamento.
 */
export const adminPrisma = new PrismaClient({ datasourceUrl: DB_URL });

/**
 * Cliente "app" (RLS forçado). Conecta como `app_user` (criado por
 * prisma/setup-app-user.ts com NOBYPASSRLS) — mesma role que a app usa
 * em produção. Tem que ser este cliente em `withTenantCtx` pra que as
 * policies de RLS sejam realmente avaliadas; superuser as ignora.
 */
export const appPrisma = new PrismaClient({ datasourceUrl: APP_USER_URL });

/**
 * Roda fn dentro de uma transação com `app.current_org_id` setado.
 * Espelha `withTenant` da app, usando o cliente `app_user` pra que RLS
 * realmente atue (postgres superuser bypassa policies — não exerce nada).
 */
export async function withTenantCtx<T>(
  organizationId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return appPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_org_id = '${organizationId}'`,
    );
    return fn(tx as unknown as PrismaClient);
  });
}

let counter = 0;
function uniqueSlug(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export type TestOrgFixture = {
  org: { id: string; slug: string; name: string };
  owner: { id: string; email: string };
  service: { id: string; name: string; durationMinutes: number; priceCents: number };
  professional: { id: string; name: string };
};

/**
 * Cria uma org de teste com 1 owner, 1 serviço, 1 profissional + working
 * hours seg-sex 9h-18h. Slug + email são únicos pra paralelizar.
 */
export async function createTestOrg(prefix = "test"): Promise<TestOrgFixture> {
  const slug = uniqueSlug(prefix);

  const org = await adminPrisma.organization.create({
    data: {
      slug,
      name: `Test ${prefix}`,
      timezone: "America/Sao_Paulo",
    },
    select: { id: true, slug: true, name: true },
  });

  const owner = await adminPrisma.user.create({
    data: {
      email: `${slug}-owner@test.local`,
      name: `Owner ${prefix}`,
      passwordHash: "$2a$10$placeholder.fixture.no.password",
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true },
  });

  await adminPrisma.membership.create({
    data: {
      userId: owner.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  const service = await adminPrisma.service.create({
    data: {
      organizationId: org.id,
      name: "Corte",
      description: null,
      durationMinutes: 30,
      priceCents: 5000,
      active: true,
    },
    select: { id: true, name: true, durationMinutes: true, priceCents: true },
  });

  const professional = await adminPrisma.professional.create({
    data: {
      organizationId: org.id,
      name: "João Teste",
      active: true,
      professionalServices: { create: { serviceId: service.id } },
    },
    select: { id: true, name: true },
  });

  // Seg-Sex 9h-18h (540-1080 min)
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI"] as const;
  await adminPrisma.workingHours.createMany({
    data: weekdays.map((d) => ({
      organizationId: org.id,
      professionalId: professional.id,
      weekday: d,
      startMinute: 540,
      endMinute: 1080,
    })),
  });

  return { org, owner, service, professional };
}

/**
 * Limpa todos os dados de teste. Usar em afterAll. Trunca em cascata
 * (todas as tabelas com FK em organizations).
 */
export async function cleanupTestData(): Promise<void> {
  // Ordem importa: filhos antes de pais quando não tem ON DELETE CASCADE.
  // Como temos CASCADE em organization, basta limpar tudo.
  await adminPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      appointments,
      time_blocks,
      working_hours,
      professional_services,
      professionals,
      services,
      memberships,
      organizations,
      sessions,
      accounts,
      verification_tokens,
      users
    RESTART IDENTITY CASCADE;
  `);
}
