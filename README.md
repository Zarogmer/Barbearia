# Barbearia SaaS

Sistema multi-tenant de agendamento para barbearias e salões de beleza.

## Status

🚧 **MVP em desenvolvimento** — sprint de 7 dias (2026-05-23 → 2026-05-30).

## Stack

- **Next.js 15** (App Router, Server Actions) + TypeScript strict
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **PostgreSQL 16** (com Row Level Security)
- **NextAuth v5** (Credentials + Google)
- **Vitest** + **Playwright** para testes
- **pnpm** como package manager

## Quickstart

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker (para Postgres local) ou conta Neon/Supabase

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `DATABASE_URL`, `NEXTAUTH_SECRET` e (opcional) credenciais Google.

### 3. Subir banco local

```bash
docker compose up -d db
```

ou aponte `DATABASE_URL` para um Neon/Supabase.

### 4. Aplicar schema + seed

```bash
pnpm db:push
pnpm db:seed
```

Seed cria uma `Organization` de exemplo (`barbearia-demo`) com 1 admin (`admin@demo.com` / `senha123`), 2 profissionais e 4 serviços.

### 5. Rodar

```bash
pnpm dev
```

Abra http://localhost:3000.

## Estrutura

```
src/
├── app/         # rotas (App Router)
├── components/  # UI (shadcn) + features
├── lib/         # db, auth, validators, server utils
├── prisma/      # schema, migrations, seed
└── tests/       # unit, integration, e2e
docs/            # documentação técnica e de produto
```

## Comandos

| Comando | Descrição |
|---|---|
| `pnpm dev` | Dev server (localhost:3000) |
| `pnpm build` | Build de produção |
| `pnpm test` | Testes unit (watch) |
| `pnpm test:run` | Testes unit (single run) |
| `pnpm test:e2e` | Testes E2E (Playwright) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:push` | Sincroniza schema (dev) |
| `pnpm db:migrate` | Migração production-safe |
| `pnpm db:seed` | Popula dados de exemplo |
| `pnpm db:studio` | Prisma Studio |

## Deploy em produção (Vercel + Neon)

### 1. Banco Neon

1. Criar projeto em https://console.neon.tech
2. Branch `main` → DB de produção
3. Copiar **Connection string (pooled)** → `DATABASE_URL`
4. Copiar **Connection string (direct)** → `DIRECT_URL` (usado por Prisma migrations)
5. Conectar via `psql $DIRECT_URL` e rodar uma vez:
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```
6. Aplicar migrations:
   ```bash
   DIRECT_URL="..." pnpm prisma migrate deploy
   ```
7. Criar role `app_user` (RLS):
   ```bash
   DIRECT_URL="..." pnpm tsx prisma/setup-app-user.ts
   ```
8. Seed (opcional, só pra ter org demo em prod):
   ```bash
   DIRECT_URL="..." pnpm db:seed
   ```

### 2. Vercel

1. Importar repo em https://vercel.com/new
2. Framework: Next.js (detectado automaticamente)
3. Build command sobrescrito por `vercel.json` (roda migrate antes do build)
4. Adicionar env vars em **Project → Settings → Environment Variables**:

   | Nome | Valor | Ambientes |
   |---|---|---|
   | `DATABASE_URL` | Pooled connection do Neon (com `app_user`) | Production, Preview |
   | `DIRECT_URL` | Direct connection do Neon (postgres role) | Production, Preview |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Production, Preview |
   | `NEXTAUTH_URL` | URL canônica (https://seu-app.vercel.app) | Production |
   | `GOOGLE_CLIENT_ID` | OAuth Google (opcional, PBI-03) | Production |
   | `GOOGLE_CLIENT_SECRET` | OAuth Google (opcional, PBI-03) | Production |
   | `RESEND_API_KEY` | Resend email (opcional, PBI-03) | Production |

5. Deploy. Primeiro deploy roda migrations automaticamente via `vercel.json`.

### 3. Smoke test pós-deploy

```bash
# 1. Health check
curl https://seu-app.vercel.app/api/health
# esperado: {"ok":true,"db":{"ok":true,...}}

# 2. Login admin
# https://seu-app.vercel.app/login
# admin@demo.com / senha123 (se rodou seed)

# 3. Fluxo cliente
# https://seu-app.vercel.app/barbearia-demo
# escolhe serviço → profissional → horário → confirma
```

### Connection limit no Neon

O withTenant abre uma transação por query. Em produção, definir
`?connection_limit=10` no `DATABASE_URL` para evitar pool exaustion
quando várias pages com `Promise.all` rodam simultâneas.

## Documentação

- 📚 **[Wiki](docs/wiki/)** — portal de navegação: por onde começar como humano novo ou como agente IA.
- 📑 **[Docs canônicos](docs/)** (`01..11`) — fonte de verdade sobre produto, arquitetura, regras de negócio.
- 🗺️ **[Diagramas](docs/diagramas/index.html)** — 4 SVGs visualizáveis no browser.
- 🗂️ **[Board Trello](https://trello.com/b/hYZHvqGV/barbearia)** — 15 PBIs em Backlog/Doing/Review/Done.

**Para agentes de IA:** leia [CLAUDE.md](CLAUDE.md) + [docs/wiki/bots/](docs/wiki/bots/) antes de propor mudanças.

## Licença

Proprietária — uso interno apenas (por enquanto).
