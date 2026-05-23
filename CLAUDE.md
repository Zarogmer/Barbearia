# CLAUDE.md — Contexto para agentes

> Este arquivo é lido por todo agente (Claude Code, Cursor, Copilot, etc.) antes de tocar em qualquer linha. **Leia inteiro antes de propor mudanças.**

## 1. O que é

SaaS multi-tenant de **agendamento para barbearias e salões de beleza**. Cliente final escolhe serviço, profissional, data e horário. Dono da barbearia gerencia a agenda, serviços e profissionais via painel admin.

**Estado:** MVP em desenvolvimento (sprint de 7 dias, 2026-05-23 → 2026-05-30).

## 2. Stack obrigatória

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 15** (App Router, Server Actions) |
| Linguagem | **TypeScript** com `strict: true` |
| UI | **Tailwind CSS** + **shadcn/ui** + **lucide-react** (ícones) |
| ORM | **Prisma** |
| Banco | **PostgreSQL 16+** (Neon ou Supabase em dev) |
| Auth | **NextAuth v5** (Credentials + Google) |
| Validação | **Zod** em todo input externo |
| Testes unit/int | **Vitest** + **@testing-library/react** |
| Testes E2E | **Playwright** |
| Lint | **ESLint** + **Prettier** + **Husky** + **lint-staged** |
| Datas/fuso | **date-fns** + **date-fns-tz** (sempre America/Sao_Paulo no MVP) |

**Não trocar nada disso sem ADR aprovado em [docs/02-arquitetura.md](docs/02-arquitetura.md).**

## 3. Princípios não-negociáveis

Estes são gatilhos automáticos para rejeitar um PR ou um patch de agente. Se você não consegue atender, **pare e pergunte ao usuário humano**.

### 3.1. Multi-tenant: todo dado pertence a uma `Organization`

- Toda tabela de negócio tem `organizationId` (UUID, NOT NULL, indexed).
- Toda query (Prisma) **deve** filtrar por `organizationId` derivado da sessão do usuário — nunca confiar em ID vindo do client.
- Banco tem **Row Level Security (RLS)** ativado em todas as tabelas de tenant. Mesmo que o código tenha bug, o banco não devolve dados de outro tenant.
- Super-admin (cross-tenant) usa um role separado e uma conexão Prisma dedicada que faz `SET LOCAL row_security = off`. **Apenas para operações administrativas, nunca em request de cliente final.**

Ver detalhes em [docs/03-modelo-dados.md](docs/03-modelo-dados.md) e [docs/04-seguranca.md](docs/04-seguranca.md).

### 3.2. Validação Zod em toda fronteira

- Todo Server Action começa com `schema.parse(input)`.
- Toda API route começa com `schema.parse(await req.json())`.
- Schemas Zod ficam em `src/lib/validators/*.ts` e são reusados em form (`zodResolver`) e server (`parse`).
- **Nunca** confiar em tipo TS de input vindo do client — TS é apagado no runtime.

### 3.3. Segredos nunca em código

- Nada de `.env` no git. Apenas `.env.example` com placeholders.
- Acesso a `process.env.X` só em código de servidor (arquivos sem `"use client"`). Variáveis públicas: prefixo `NEXT_PUBLIC_`.

### 3.4. Sem `any`, sem `// @ts-ignore`, sem `eslint-disable` casual

- `any` precisa de comentário justificando + issue para remover.
- `@ts-expect-error` aceitável com comentário; `@ts-ignore` proibido.

### 3.5. Server Components por padrão; Client Components só quando necessário

- Estado, eventos, browser APIs → `"use client"`.
- Tudo que pode ser server → server. Reduz JS no cliente e melhora perf.

### 3.6. Datas sempre em UTC no banco, fuso na borda

- `DateTime` no Prisma → `timestamptz` no Postgres.
- Conversão para `America/Sao_Paulo` apenas na renderização ou no input do usuário.
- Nunca fazer aritmética de data com strings.

## 4. Comandos essenciais

```bash
# instalar
pnpm install

# rodar dev
pnpm dev                  # localhost:3000

# banco
pnpm db:push              # sincroniza schema -> dev DB
pnpm db:migrate           # cria migração (production-safe)
pnpm db:seed              # popula dados de exemplo
pnpm db:studio            # Prisma Studio

# testes
pnpm test                 # Vitest watch
pnpm test:run             # Vitest single run
pnpm test:e2e             # Playwright

# qualidade
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit
pnpm format               # Prettier write

# build
pnpm build
```

## 5. Estrutura de pastas (resumo)

```
src/
├── app/                  # rotas Next.js (App Router)
│   ├── (public)/         # landing, login, fluxo cliente
│   ├── (admin)/          # painel logado da barbearia
│   ├── api/              # rotas REST quando necessário (webhooks)
│   └── layout.tsx
├── components/
│   ├── ui/               # shadcn primitives (não editar manualmente)
│   └── features/         # componentes específicos do domínio
├── lib/
│   ├── db.ts             # cliente Prisma com tenant context
│   ├── auth.ts           # NextAuth config
│   ├── validators/       # schemas Zod
│   ├── server/           # funções server-only (queries, services)
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

Detalhes em [docs/02-arquitetura.md](docs/02-arquitetura.md).

## 6. Como pegar uma PBI

1. Abra [docs/09-pbis.md](docs/09-pbis.md), encontre a PBI com status `pending` e sem dependência aberta.
2. Leia **todo** o bloco da PBI: contexto, AC, arquivos a tocar, DoD.
3. Crie branch `feat/<slug>` ou `fix/<slug>` a partir de `main`.
4. Implemente. Escreva testes na mesma PR (não em "PR de testes" depois).
5. Verifique localmente: `pnpm lint && pnpm typecheck && pnpm test:run`.
6. Abra PR usando o template. CI precisa passar verde antes de merge.

## 7. Convenções rápidas

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/). Ex: `feat(booking): add slot conflict validation`.
- **Branches:** `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.
- **PRs:** título no padrão de commit. Descrição inclui PBI relacionada e screenshots se UI.
- **Naming:** `PascalCase` para componentes/tipos, `camelCase` para funções/variáveis, `kebab-case` para arquivos não-componente, `SCREAMING_SNAKE` para env vars.

## 8. Quando NÃO mexer sem perguntar

- **Schema Prisma** (`prisma/schema.prisma`): mudança implica migração + impacto em RLS. Sempre alinhar com humano.
- **NextAuth config** (`src/lib/auth.ts`): mudança afeta toda sessão.
- **Middleware** (`src/middleware.ts`): afeta toda request.
- **Políticas RLS** (`prisma/migrations/*sql`): afeta segurança de todos os tenants.
- **`package.json` deps:** adicionar lib nova precisa justificar (peso, manutenção, alternativa nativa).

## 9. Onde ler mais

- [docs/00-overview.md](docs/00-overview.md) — índice + leitura por papel
- [docs/01-visao-produto.md](docs/01-visao-produto.md) — o quê e por quê
- [docs/02-arquitetura.md](docs/02-arquitetura.md) — decisões técnicas
- [docs/03-modelo-dados.md](docs/03-modelo-dados.md) — schema + multi-tenancy
- [docs/04-seguranca.md](docs/04-seguranca.md) — auth, RLS, OWASP
- [docs/05-testes.md](docs/05-testes.md) — pirâmide e ferramentas
- [docs/06-padroes-codigo.md](docs/06-padroes-codigo.md) — lint, commits, naming
- [docs/07-regras-negocio.md](docs/07-regras-negocio.md) — slots, cancelamento, no-show
- [docs/08-prototipo.md](docs/08-prototipo.md) — wireframes e fluxos
- [docs/09-pbis.md](docs/09-pbis.md) — backlog
- [docs/10-plano-semana.md](docs/10-plano-semana.md) — cronograma
