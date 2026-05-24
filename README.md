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

## Documentação

- 📚 **[Wiki](docs/wiki/)** — portal de navegação: por onde começar como humano novo ou como agente IA.
- 📑 **[Docs canônicos](docs/)** (`01..11`) — fonte de verdade sobre produto, arquitetura, regras de negócio.
- 🗺️ **[Diagramas](docs/diagramas/index.html)** — 4 SVGs visualizáveis no browser.
- 🗂️ **[Board Trello](https://trello.com/b/hYZHvqGV/barbearia)** — 15 PBIs em Backlog/Doing/Review/Done.

**Para agentes de IA:** leia [CLAUDE.md](CLAUDE.md) + [docs/wiki/bots/](docs/wiki/bots/) antes de propor mudanças.

## Licença

Proprietária — uso interno apenas (por enquanto).
