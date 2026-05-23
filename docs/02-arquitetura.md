# 02 — Arquitetura

## Visão de 10 mil metros

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (PWA)                          │
│   - React Server Components + Client Components (Next 15)    │
│   - Tailwind + shadcn/ui                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Next.js 15 (Vercel)                       │
│  ┌────────────────┬────────────────┬────────────────────┐   │
│  │  App Router    │  Server        │  API Routes        │   │
│  │  (RSC + Pages) │  Actions       │  (webhooks only)   │   │
│  └────────┬───────┴────────┬───────┴─────────┬──────────┘   │
│           │                │                  │              │
│           └────────────────┴──────────────────┘              │
│                            │                                 │
│                  ┌─────────▼──────────┐                      │
│                  │   lib/server/*     │  ← regras de negócio │
│                  │   - bookingService │                      │
│                  │   - tenantContext  │                      │
│                  └─────────┬──────────┘                      │
│                            │                                 │
│                  ┌─────────▼──────────┐                      │
│                  │  Prisma Client     │                      │
│                  │  (tenant-aware)    │                      │
│                  └─────────┬──────────┘                      │
└────────────────────────────┼─────────────────────────────────┘
                             │ SQL
                             │
                  ┌──────────▼──────────┐
                  │   PostgreSQL 16     │
                  │   + Row Level       │
                  │     Security (RLS)  │
                  │   (Neon/Supabase)   │
                  └─────────────────────┘

         Externos: NextAuth (Google), Resend (email)
```

## Estrutura de pastas (detalhada)

```
barbearia/
├── CLAUDE.md
├── README.md
├── docker-compose.yml              # postgres local
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                 # shadcn config
├── playwright.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc
├── .env.example
├── .gitignore
├── .husky/
│   └── pre-commit                  # lint-staged
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   └── 20260523_init/
│   │       ├── migration.sql       # CREATE TABLES + RLS POLICIES
│   │       └── README.md
│   └── seed.ts
│
├── public/
│   ├── manifest.json               # PWA
│   ├── icons/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout (server)
│   │   ├── globals.css
│   │   ├── (public)/               # rotas sem auth obrigatório
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # landing
│   │   │   ├── login/
│   │   │   ├── cadastro/
│   │   │   └── [orgSlug]/          # fluxo público da barbearia
│   │   │       ├── page.tsx        # vitrine + CTA agendar
│   │   │       └── agendar/
│   │   │           ├── page.tsx    # passo 1: serviço
│   │   │           ├── profissional/page.tsx
│   │   │           ├── horario/page.tsx
│   │   │           └── confirmar/page.tsx
│   │   ├── (admin)/                # rotas autenticadas (admin/staff)
│   │   │   ├── layout.tsx          # checa sessão + role
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── agenda/page.tsx
│   │   │   ├── servicos/
│   │   │   ├── profissionais/
│   │   │   └── configuracoes/
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── health/route.ts
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn (auto-gerado, não editar manual)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── features/
│   │       ├── booking/
│   │       │   ├── ServicePicker.tsx
│   │       │   ├── ProfessionalPicker.tsx
│   │       │   ├── SlotPicker.tsx
│   │       │   └── BookingSummary.tsx
│   │       ├── admin/
│   │       │   ├── AgendaDayView.tsx
│   │       │   ├── ServiceForm.tsx
│   │       │   └── ProfessionalForm.tsx
│   │       └── shared/
│   │           ├── Header.tsx
│   │           └── EmptyState.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                   # prisma client + getTenantDb()
│   │   ├── auth.ts                 # NextAuth config
│   │   ├── validators/             # Zod schemas
│   │   │   ├── booking.ts
│   │   │   ├── service.ts
│   │   │   ├── professional.ts
│   │   │   └── auth.ts
│   │   ├── server/                 # server-only (não importável de client)
│   │   │   ├── booking-service.ts  # regras de negócio
│   │   │   ├── slot-calculator.ts  # gera slots disponíveis
│   │   │   ├── tenant-context.ts   # extrai org da sessão
│   │   │   └── email/
│   │   │       └── resend.ts
│   │   ├── utils.ts                # cn(), formatDate, etc.
│   │   └── constants.ts
│   │
│   ├── hooks/
│   │   ├── useToast.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── types/
│   │   ├── auth.d.ts               # extende Session do NextAuth
│   │   └── domain.ts
│   │
│   └── middleware.ts               # auth + tenant resolution
│
└── tests/
    ├── unit/
    │   ├── slot-calculator.test.ts
    │   ├── validators/
    │   └── components/
    ├── integration/
    │   ├── booking-service.test.ts
    │   └── tenant-isolation.test.ts
    └── e2e/
        ├── client-booking.spec.ts
        ├── admin-agenda.spec.ts
        └── cross-tenant-leak.spec.ts
```

## Camadas e responsabilidades

### App Router (`src/app/`)

- Roteamento, layouts, Server Components.
- **Não contém regras de negócio.** Apenas orquestra: lê params, chama `lib/server/*`, renderiza.
- Server Actions ficam **dentro** dos arquivos `actions.ts` por feature ou inline em `page.tsx` quando triviais.

### Lib Server (`src/lib/server/`)

- **Coração da regra de negócio.**
- Funções puras (na medida do possível) que recebem `organizationId` explícito + input validado.
- Não conhece request/response — recebe e devolve objetos de domínio.
- Testável sem subir Next.js (Vitest + DB de teste).

### Validators (`src/lib/validators/`)

- Schemas Zod compartilhados entre client (forms via `react-hook-form` + `zodResolver`) e server (`parse()`).
- Toda fronteira (Server Action, API route) valida antes de qualquer lógica.

### Components (`src/components/`)

- `ui/` é shadcn — primitivas com `cva` para variantes.
- `features/` é específico de domínio. Cada feature tem seus próprios componentes; deduplicação é OK até virar padrão.
- Componentes server por padrão; `"use client"` apenas quando precisa de estado/eventos.

### Middleware (`src/middleware.ts`)

- Resolve sessão (NextAuth).
- Em rotas `(admin)/*`: exige sessão válida, redireciona para `/login` se não.
- Em rotas `[orgSlug]/*`: resolve `orgSlug` → `organizationId` e injeta em headers (`x-org-id`).
- **Não faz query no banco** (perf): cache em memória curto ou em request header de upstream.

## Decisões arquiteturais (ADRs)

Format: contexto → decisão → consequências.

### ADR-001: Next.js 15 App Router em monorepo único (vs separado front/back)

**Contexto:** time pequeno, prazo curto, app majoritariamente CRUD + UI.

**Decisão:** Next.js full-stack (RSC + Server Actions + Prisma direto). Sem GraphQL, sem tRPC no MVP.

**Consequências (+):** menos boilerplate, type-safety end-to-end, deploy único (Vercel).
**Consequências (-):** acoplamento UI ↔ DB. Aceitamos — split se v2 exigir.

### ADR-002: Server Actions como API primária; REST só para webhooks

**Contexto:** todo fluxo é interno; não há mobile nativo nem terceiros consumindo API no MVP.

**Decisão:** mutations via Server Actions. Webhooks (futuro: Stripe, WhatsApp Cloud) viram `api/webhooks/*`.

**Consequências:** Server Actions exigem `"use server"` no topo e validação Zod obrigatória — sem isso, qualquer input do client virou execução server.

### ADR-003: Prisma vs Drizzle

**Contexto:** ambos viáveis. Time tem mais experiência com Prisma.

**Decisão:** Prisma. RLS é compatível (basta `SET app.current_org_id` em transação).

**Consequências (+):** dev experience, migrações fáceis, ecossistema.
**Consequências (-):** runtime mais pesado que Drizzle. Aceitável para MVP.

### ADR-004: Multi-tenant single-DB + RLS (vs schema-per-tenant)

**Contexto:** poucas barbearias (< 50 nos primeiros 6 meses).

**Decisão:** uma única base, `organizationId` em toda tabela, Postgres RLS para defesa-em-profundidade.

**Consequências (+):** simples, migração única, queries cross-tenant possíveis para super-admin.
**Consequências (-):** isolamento depende de RLS bem configurado. Testes E2E cross-tenant obrigatórios.

### ADR-005: NextAuth v5 (Auth.js) vs Clerk/Supabase Auth

**Contexto:** quer email+senha + Google, sem dependência de SaaS de auth.

**Decisão:** NextAuth v5 com adapter Prisma.

**Consequências:** mais código nosso para gerenciar (verify email, reset password). Aceitável para MVP — Resend cobre os emails.

### ADR-006: Tailwind + shadcn/ui (vs Mantine/Chakra/MUI)

**Contexto:** quer estética customizável, sem peso de runtime de CSS-in-JS.

**Decisão:** Tailwind + shadcn (copy-paste, código nosso).

**Consequências (+):** zero runtime, máxima customização.
**Consequências (-):** mais código de UI no repo. Aceitável.

### ADR-007: Fuso fixo America/Sao_Paulo no MVP

**Contexto:** todo cliente inicial é brasileiro.

**Decisão:** banco em UTC (`timestamptz`); todas as conversões usam `America/Sao_Paulo`. `Organization.timezone` existe no schema mas só leitura no MVP — não dá pra mudar.

**Consequências:** v2 abre escolha de fuso por org.

### ADR-008: Deploy Vercel + Neon (vs VPS / AWS)

**Contexto:** prazo curto, sem ops dedicada.

**Decisão:** Vercel (Next.js) + Neon (Postgres serverless).

**Consequências (+):** zero config, preview por PR, CDN.
**Consequências (-):** lock-in moderado, custos podem crescer. Aceitável para MVP.

## Fluxo de uma request típica (cliente agenda)

1. Browser → `GET /[orgSlug]/agendar/horario?serviceId=X&professionalId=Y&date=Z`
2. `middleware.ts` resolve `orgSlug` → `organizationId`, anexa em header.
3. `page.tsx` (Server Component) lê params, chama `getAvailableSlots({ organizationId, serviceId, professionalId, date })` de `lib/server/slot-calculator.ts`.
4. `slot-calculator.ts` abre transação Prisma com `SET LOCAL app.current_org_id = <id>` (ativa RLS), consulta `WorkingHours`, `Appointment` e `Block` para o dia, devolve array de slots.
5. RSC renderiza HTML com os slots disponíveis.
6. Usuário clica → form submete via Server Action `confirmBooking(formData)`.
7. Server Action: `parse()` com Zod → verifica conflito → cria `Appointment` em transação → manda email Resend → `revalidatePath()` → redireciona.

## Deploy e ambientes

| Ambiente | URL | Branch | DB |
|---|---|---|---|
| Local | localhost:3000 | qualquer | Docker Postgres |
| Preview | `*.vercel.app` | toda PR | Neon branch |
| Produção | `barbearia.app` (futuro) | `main` | Neon prod |

## O que está fora do escopo arquitetural do MVP

- **Cache de aplicação (Redis):** Next.js já tem `revalidate` + RSC cache. Adicionamos Redis se virar gargalo.
- **Filas (BullMQ, etc.):** emails vão síncronos via Resend; jobs entram em v2.
- **Observabilidade (Sentry, OpenTelemetry):** logs do Vercel + console no MVP. Sentry no D7 se sobrar tempo.
- **Feature flags:** não. Se precisar esconder algo, deleta o código.
