# 🧭 Trilhas por papel

> Mesmos docs, leitura priorizada por o que você faz. Cada trilha sugere a 1ª PBI pra você pegar.

## 🔧 Dev Backend

**Leitura (1h):**
1. [01-visao-produto.md](../../01-visao-produto.md) — o quê (15 min)
2. [03-modelo-dados.md](../../03-modelo-dados.md) — schema + RLS + EXCLUDE (20 min)
3. [04-seguranca.md](../../04-seguranca.md) — auth + matriz de permissões (15 min)
4. [07-regras-negocio.md](../../07-regras-negocio.md) — RN-01..20, invariantes (10 min)

**Diagramas:**
- [arquitetura-multi-tenant.svg](../../diagramas/arquitetura-multi-tenant.svg)
- [algoritmo-slot-calculator.svg](../../diagramas/algoritmo-slot-calculator.svg)

**Patterns que você vai usar todo dia:**
- `withTenant(orgId, async db => {...})` em toda query
- `schema.parse(input)` no início de toda SA
- `"server-only"` em utils de servidor
- `revalidatePath` após mutação

Detalhes em [bots/patterns.md](../bots/patterns.md) (vale pra humano também).

**Primeira PBI sugerida:**
- Se nada foi feito ainda: [PBI-01](../../11-pbis-detalhado.md#pbi-01--postgres-local--rls--migration-inicial)
- Se PBI-01..05 ✓: [PBI-06 (slot-calculator)](../../11-pbis-detalhado.md#pbi-06--slot-calculator-coração-do-produto) — função pura, fácil de testar, alto impacto

---

## 🎨 Dev Frontend

**Leitura (1h):**
1. [01-visao-produto.md](../../01-visao-produto.md) — persona, KPIs (15 min)
2. [08-prototipo.md](../../08-prototipo.md) — W-01..W-12 (20 min, scanneable)
3. [02-arquitetura.md](../../02-arquitetura.md) — onde código mora (15 min)
4. [06-padroes-codigo.md](../../06-padroes-codigo.md) §Server vs Client + estrutura de feature (10 min)

**Diagramas:**
- [fluxo-cliente.svg](../../diagramas/fluxo-cliente.svg)
- [fluxo-admin.svg](../../diagramas/fluxo-admin.svg)

**Estado atual das telas:**
- Existem em `src/app/(public)/[orgSlug]/...` e `src/app/admin/*` mas usam `src/lib/mock-data.ts`.
- Sua missão na maioria das PBIs front: **trocar mock por loader real (RSC) + plugar Server Action no submit**.

**Padrões críticos:**
- State entre passos do fluxo cliente = **URL search params** (sem `useState` global, sem cookie, sem localStorage).
- `react-hook-form` + `zodResolver(...)` em todo form.
- shadcn `Calendar`, `Dialog`, `Command` — não reinventar.
- Mobile-first; `max-w-md mx-auto` em rotas públicas.

**Primeira PBI sugerida:**
- [PBI-07 (fluxo cliente)](../../11-pbis-detalhado.md#pbi-07--fluxo-cliente-4-passos-sem-submit) — depois que PBI-06 fechar
- Ou [PBI-04 (CRUD serviços)](../../11-pbis-detalhado.md#pbi-04--crud-serviços-admin) — paralelizável

---

## 🧪 QA

**Leitura (45 min):**
1. [01-visao-produto.md](../../01-visao-produto.md) — escopo MVP, KPIs (10 min)
2. [07-regras-negocio.md](../../07-regras-negocio.md) — **toda RN é base de caso de teste** (20 min)
3. [05-testes.md](../../05-testes.md) — pirâmide, ferramentas, cobertura (15 min)

**Diagramas:**
- [fluxo-cliente.svg](../../diagramas/fluxo-cliente.svg) — happy path + ramos de erro
- [arquitetura-multi-tenant.svg](../../diagramas/arquitetura-multi-tenant.svg) — entende por que cross-tenant é o pior bug

**Onde foca:**
- AC de cada PBI em [09-pbis.md](../../09-pbis.md) é seu checklist.
- [PBI-11 (cross-tenant)](../../11-pbis-detalhado.md#pbi-11--testes-de-isolamento-cross-tenant) é P0 e é "QA-shaped" — testes de segurança que não podem falhar.
- Casos de borda já documentados: [07 §Casos de borda](../../07-regras-negocio.md#casos-de-borda-documentados).

**Primeira PBI sugerida:**
- [PBI-11 (isolamento cross-tenant)](../../11-pbis-detalhado.md#pbi-11--testes-de-isolamento-cross-tenant) — Crítico, autocontido.
- Em paralelo: revisar AC de PBIs em desenvolvimento (PBI-04..08).

---

## 📋 PM / Produto

**Leitura (30 min):**
1. [01-visao-produto.md](../../01-visao-produto.md) (10 min)
2. [07-regras-negocio.md](../../07-regras-negocio.md) (10 min)
3. [10-plano-semana.md](../../10-plano-semana.md) — D1..D7 (5 min)
4. [09-pbis.md](../../09-pbis.md) — refinamento e priorização (5 min)

**Diagramas:**
- [fluxo-cliente.svg](../../diagramas/fluxo-cliente.svg) — UX do cliente
- [fluxo-admin.svg](../../diagramas/fluxo-admin.svg) — UX do owner

**Onde foca:**
- [Board Trello](https://trello.com/b/hYZHvqGV/barbearia) — Backlog/Doing/Review/Done
- Priorização: ordem default já é D1→D7 em [10-plano-semana.md](../../10-plano-semana.md). Se mudar, atualiza esse doc.
- Caminho crítico: `PBI-01 → 02 → 04 → 05 → 06 → 07 → 08 → 09`. Atrasos aqui atrasam o MVP inteiro.

**Decisões em aberto que travam o time:**
- Política exata de cancelamento `< 2h` (RN-07) — confirma com cliente real?
- `allowGuestBooking` default `false` ou `true`?
- v2 features (Stripe, WhatsApp, Multi-idioma) — backlog futuro, **não** entram no MVP.

---

## 🚀 DevOps / Infra

**Leitura (40 min):**
1. [02-arquitetura.md](../../02-arquitetura.md) — stack + deploy strategy (15 min)
2. [03-modelo-dados.md](../../03-modelo-dados.md) §Connection roles + RLS migration (15 min)
3. [04-seguranca.md](../../04-seguranca.md) §Rate limit + segredos (10 min)

**Onde foca:**
- [PBI-13 (CI GitHub Actions)](../../11-pbis-detalhado.md#pbi-13--ci-no-github-actions)
- [PBI-14 (Deploy Vercel + Neon)](../../11-pbis-detalhado.md#pbi-14--deploy-vercel--neon)

**Detalhes importantes:**
- 3 connection strings: `DATABASE_URL` (app_user, RLS on), `DIRECT_URL` (app_migrator, p/ migrações), `DATABASE_ADMIN_URL` (app_superuser, scripts).
- Em Neon/Supabase, roles podem ter nomes diferentes — adapta o seed e a migration `00000_rls_setup` conforme.
- Branch protection main: require CI verde.

---

## 🎯 Designer

**Leitura (20 min):**
1. [01-visao-produto.md](../../01-visao-produto.md) §Persona (10 min)
2. [08-prototipo.md](../../08-prototipo.md) — wireframes + princípios UX (10 min)

**Onde foca:**
- Protótipo de alta fidelidade em [`public/prototypes/`](../../../public/prototypes/) (5 variações visuais + `system.html` navegável)
- Princípios de UX: mobile-first, 4 toques no cliente, sem login obrigatório, erros perto do erro.
- Paletas implementadas: violet (default), amber (dourado), stone (neutro). Trocável em runtime no `system.html`.

**Decisões pendentes:**
- Paleta final pra MVP — votar com o time.
- Logo + identidade visual da barbearia demo.
- v2: customização visual por tenant.
