# 03 — Modelo de dados

## Princípios

1. **Multi-tenant por `organizationId`.** Toda entidade de negócio tem `organizationId NOT NULL` indexado.
2. **RLS é a última linha de defesa.** Mesmo com bug de aplicação, o banco não devolve dados de outro tenant.
3. **IDs são UUID v7** (ordenáveis por tempo, melhores para índice B-tree que UUID v4). Geração via `gen_random_uuid()` aceitável no MVP.
4. **Timestamps em UTC** (`timestamptz`). Conversão de fuso só na borda.
5. **Sem soft-delete generalizado.** Apenas `Appointment` tem `cancelledAt` (auditoria de cancelamento). Outras tabelas têm DELETE real — com cuidado.

## Diagrama ER (texto)

```
Organization (tenant root)
  ├── 1..* Membership ──── 1 User
  ├── 1..* Service
  ├── 1..* Professional
  │       ├── 1..* WorkingHours
  │       ├── 1..* TimeBlock
  │       └── *..* Service (via ProfessionalService)
  └── 1..* Appointment ──── 1 User (cliente, opcional p/ walk-in)
                       └── 1 Professional
                       └── 1 Service
```

## Schema Prisma (referência)

> O arquivo real fica em `prisma/schema.prisma`. Esta é a versão de referência para entender o domínio. Mantenha em sincronia.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Tenancy ──────────────────────────────────────────────

model Organization {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug        String   @unique // usado em /:orgSlug/...
  name        String
  timezone    String   @default("America/Sao_Paulo")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  memberships    Membership[]
  services       Service[]
  professionals  Professional[]
  appointments   Appointment[]

  @@map("organizations")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  name         String
  phone        String?
  passwordHash String?  // null se OAuth-only
  emailVerifiedAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships  Membership[]   // só admins/staff têm
  appointments Appointment[]  // como cliente

  // NextAuth adapter
  accounts Account[]
  sessions Session[]

  @@map("users")
}

enum MembershipRole {
  OWNER       // dono da barbearia: full access
  STAFF       // funcionário: agenda própria + clientes
}

model Membership {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String         @db.Uuid
  organizationId String         @db.Uuid
  role           MembershipRole
  professionalId String?        @unique @db.Uuid  // se STAFF, vinculado a um Professional
  createdAt      DateTime       @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  professional Professional? @relation(fields: [professionalId], references: [id], onDelete: SetNull)

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@map("memberships")
}

// ─── Domínio ──────────────────────────────────────────────

model Service {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId  String   @db.Uuid
  name            String
  description     String?
  durationMinutes Int      // múltiplo de 5 recomendado
  priceCents      Int      // em centavos para evitar float
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization         Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  professionalServices ProfessionalService[]
  appointments         Appointment[]

  @@index([organizationId, active])
  @@map("services")
}

model Professional {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId  String   @db.Uuid
  name            String
  bio             String?
  photoUrl        String?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization         Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  membership           Membership?
  workingHours         WorkingHours[]
  timeBlocks           TimeBlock[]
  professionalServices ProfessionalService[]
  appointments         Appointment[]

  @@index([organizationId, active])
  @@map("professionals")
}

model ProfessionalService {
  professionalId String @db.Uuid
  serviceId      String @db.Uuid

  professional Professional @relation(fields: [professionalId], references: [id], onDelete: Cascade)
  service      Service      @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([professionalId, serviceId])
  @@map("professional_services")
}

enum Weekday {
  SUN
  MON
  TUE
  WED
  THU
  FRI
  SAT
}

model WorkingHours {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  professionalId String   @db.Uuid
  weekday        Weekday
  startMinute    Int      // minutos desde 00:00 local (0..1439)
  endMinute      Int

  professional Professional @relation(fields: [professionalId], references: [id], onDelete: Cascade)

  @@unique([professionalId, weekday, startMinute])
  @@index([organizationId])
  @@map("working_hours")
}

model TimeBlock {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  professionalId String   @db.Uuid
  startsAt       DateTime
  endsAt         DateTime
  reason         String?  // "férias", "almoço", "pessoal"
  createdAt      DateTime @default(now())

  professional Professional @relation(fields: [professionalId], references: [id], onDelete: Cascade)

  @@index([organizationId, professionalId, startsAt])
  @@map("time_blocks")
}

enum AppointmentStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

model Appointment {
  id             String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String            @db.Uuid
  professionalId String            @db.Uuid
  serviceId      String            @db.Uuid
  userId         String?           @db.Uuid  // null se walk-in sem cadastro
  customerName   String            // copy-on-write do User.name (preservar histórico)
  customerPhone  String?           // copy-on-write
  startsAt       DateTime          // UTC
  endsAt         DateTime          // UTC; derivado de service.durationMinutes
  status         AppointmentStatus @default(CONFIRMED)
  notes          String?
  cancelledAt    DateTime?
  cancelReason   String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  professional Professional @relation(fields: [professionalId], references: [id])
  service      Service      @relation(fields: [serviceId], references: [id])
  user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId, professionalId, startsAt])
  @@index([organizationId, startsAt])
  @@index([userId, startsAt])
  @@map("appointments")
}

// ─── NextAuth adapter (gerado pelo @auth/prisma-adapter) ───

model Account {
  id                String  @id @default(cuid())
  userId            String  @db.Uuid
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String   @db.Uuid
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

## Multi-tenancy: como funciona na prática

### 1. Toda query tem contexto de tenant

Em código de aplicação, o helper `getTenantDb(organizationId)` em `src/lib/db.ts` devolve um Prisma client em transação com:

```sql
SET LOCAL app.current_org_id = '<organizationId>';
SET LOCAL row_security = on;
```

A partir daí, qualquer query do Prisma é filtrada pelo Postgres antes de retornar dados.

### 2. Resolução do `organizationId`

- **Rotas `(admin)/*`:** `organizationId` vem do `Membership` ativo do usuário na sessão.
- **Rotas `[orgSlug]/*` (público):** `organizationId` vem do middleware resolvendo `orgSlug` → `Organization.id`. Usuário pode não estar logado.

### 3. Connection roles no Postgres

| Role | Uso | RLS ativo? |
|---|---|---|
| `app_user` | conexão padrão da aplicação | sim — RLS sempre on |
| `app_superuser` | jobs administrativos, super-admin | bypass via `BYPASSRLS` |
| `app_migrator` | rodar migrações | bypass |

Aplicação **só** conecta como `app_user`. Strings de conexão diferentes em `.env`:

```env
DATABASE_URL=postgresql://app_user:...@host/db
DATABASE_ADMIN_URL=postgresql://app_superuser:...@host/db  # só usado em scripts
DIRECT_URL=postgresql://app_migrator:...@host/db           # usado por prisma migrate
```

## Políticas RLS (SQL)

Aplicadas em uma migration manual após o `init` do Prisma.

```sql
-- helper: lê tenant atual da transação
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- ativar RLS em todas as tabelas de tenant
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours  ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;

-- policy padrão: vê e modifica apenas o próprio tenant
CREATE POLICY tenant_isolation ON services
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY tenant_isolation ON professionals
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY tenant_isolation ON working_hours
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY tenant_isolation ON time_blocks
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY tenant_isolation ON appointments
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY tenant_isolation ON memberships
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

-- organizations: vê apenas a própria (pelo id)
CREATE POLICY self_only ON organizations
  USING (id = current_org_id())
  WITH CHECK (id = current_org_id());

-- forçar policy mesmo para dono da tabela
ALTER TABLE services       FORCE ROW LEVEL SECURITY;
ALTER TABLE professionals  FORCE ROW LEVEL SECURITY;
ALTER TABLE working_hours  FORCE ROW LEVEL SECURITY;
ALTER TABLE time_blocks    FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments   FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships    FORCE ROW LEVEL SECURITY;
ALTER TABLE organizations  FORCE ROW LEVEL SECURITY;
```

### Por que `FORCE ROW LEVEL SECURITY`?

Sem `FORCE`, o dono da tabela (geralmente o usuário que rodou as migrações) ignora a policy. Como queremos que mesmo o `app_user` aplique RLS, forçamos.

### Como `app_user` evita ser o owner?

Migrações rodam como `app_migrator` (que vira o owner das tabelas). `app_user` é GRANT-ado com SELECT/INSERT/UPDATE/DELETE mas não é owner. Com `FORCE`, ele obedece a policy.

### User (tabela global, sem RLS)

`users` não tem RLS — é a identidade global. Cliente pode existir sem membership. Risco: query mal escrita pode listar todos os emails. Mitigação:

- Aplicação **nunca** faz `db.user.findMany()` sem filtro.
- Endpoint admin de listagem só lista usuários com Membership na org atual (já filtrado por RLS na tabela `memberships`).

## Patterns de query

### Padrão: query dentro de transação com tenant

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function withTenant<T>(
  organizationId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_org_id = '${organizationId}'`
    );
    return fn(tx as PrismaClient);
  });
}
```

> **Atenção:** `$executeRawUnsafe` com interpolação de string só é seguro aqui porque `organizationId` é validado como UUID antes de chamar. Para qualquer outro uso, use `$executeRaw` com tag de template.

### Padrão: server-only helpers

```ts
// src/lib/server/booking-service.ts
import "server-only";
import { withTenant } from "@/lib/db";
import { bookingSchema } from "@/lib/validators/booking";

export async function createBooking(orgId: string, raw: unknown) {
  const input = bookingSchema.parse(raw);   // valida
  return withTenant(orgId, async (db) => {  // RLS on
    // ... checa conflito, insere
  });
}
```

## Índices críticos

- `appointments(organization_id, professional_id, starts_at)` — query "agenda do profissional no dia".
- `appointments(organization_id, starts_at)` — query "agenda do dia".
- `appointments(user_id, starts_at)` — query "meus agendamentos".
- `services(organization_id, active)` — listar serviços ativos.
- `professionals(organization_id, active)` — listar profissionais ativos.

## Constraint extra: anti-conflito de horário

A regra "não pode ter 2 appointments do mesmo profissional sobrepondo" precisa ser garantida no DB, não só na aplicação (race condition em alta concorrência). Solução: `EXCLUDE` constraint com extensão `btree_gist`.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD CONSTRAINT no_overlap_per_professional
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status = 'CONFIRMED');
```

- Apenas `CONFIRMED` participa do EXCLUDE — `CANCELLED` libera o slot.
- Range `'[)'` (fechado-aberto) garante que appointment terminando às 10:00 não conflita com um começando exatamente às 10:00.

## Seed (referência)

`prisma/seed.ts` cria:

- `Organization` "Barbearia Demo" (`slug: "barbearia-demo"`)
- `User` admin `admin@demo.com` / `senha123` (hash bcrypt) com `Membership(OWNER)`
- 2 `Professional`: "João" e "Maria"
- 4 `Service`: Corte (30min/R$50), Barba (20min/R$30), Combo (50min/R$70), Coloração (90min/R$150)
- `WorkingHours`: seg-sex 09:00-19:00, sáb 09:00-17:00 para ambos
- `ProfessionalService`: João faz Corte/Barba/Combo, Maria faz todos
- 3 `Appointment` confirmados nos próximos dias para visualizar a agenda

## Migração inicial: ordem das operações

1. `prisma migrate dev --name init` — cria tabelas e índices.
2. SQL manual (em `migrations/00000_rls_setup/migration.sql`):
   - `CREATE ROLE app_user`, `app_superuser`, `app_migrator`.
   - `GRANT` apropriado.
   - `CREATE EXTENSION btree_gist`.
   - `CREATE FUNCTION current_org_id()`.
   - Policies RLS + `FORCE ROW LEVEL SECURITY`.
   - `EXCLUDE` constraint.

Em prod (Neon/Supabase), roles podem ter nomes diferentes — documentar no README de migrations.

## Testes obrigatórios

- **Cross-tenant leak** (E2E): logar como org A, tentar GET no recurso da org B → 404, nunca 200. Documentado em [docs/05-testes.md](05-testes.md).
- **Conflito de horário** (unit + integration): tentar criar 2 appointments sobrepostos → segundo falha com erro de constraint.
- **RLS sob bug de app** (integration): forçar query sem `SET app.current_org_id` → retorna 0 linhas, nunca dados.
