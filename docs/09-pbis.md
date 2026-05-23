# 09 — PBIs (Product Backlog Items)

> Cada PBI é **autocontida**: humano OU agente Claude consegue executar lendo apenas o bloco da PBI + os docs linkados. Cada bloco tem: contexto, AC, arquivos, instruções para agente, estimativa, dependências, DoD.

## Convenções

- **ID:** `PBI-NN` (sequencial).
- **Status:** `pending` / `in_progress` / `review` / `done`.
- **Estimativa:** em horas (`h`). > 8h = quebrar.
- **Tags:** `[backend]`, `[frontend]`, `[infra]`, `[testes]`, `[docs]`, `[seguranca]`.
- **Dependências:** lista de IDs que precisam estar `done`.

## DoD universal (vale para toda PBI)

- [ ] Código segue `docs/06-padroes-codigo.md`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test:run` verde local.
- [ ] PR aberta com descrição usando template.
- [ ] Pelo menos 1 reviewer aprovou (2 se mexer em `prisma/`, `auth`, `middleware`, RLS).
- [ ] Docs atualizados se mudou comportamento de domínio ou schema.
- [ ] CI verde.

---

## D2 — Fundação técnica

### PBI-01 — Setup Postgres local + migration inicial

**Tags:** `[infra]` `[backend]`
**Estimativa:** 2h
**Depende de:** scaffold (D1)

**Contexto:**
Precisamos rodar Postgres 16 localmente com extensões necessárias (`btree_gist` para EXCLUDE constraint) e aplicar migration inicial gerada pelo Prisma + script SQL com RLS.

**AC (critérios de aceite):**

- [ ] `docker-compose.yml` na raiz sobe Postgres 16 em `localhost:5432` com volume persistente.
- [ ] `pnpm db:push` aplica `prisma/schema.prisma` (entidades de [03-modelo-dados.md](03-modelo-dados.md)) sem erro.
- [ ] Script `prisma/migrations/00000_rls_setup/migration.sql` cria roles (`app_user`, `app_migrator`), extensão `btree_gist`, função `current_org_id()`, policies RLS e EXCLUDE constraint.
- [ ] `pnpm db:seed` popula `Organization "Barbearia Demo"` + 2 profissionais + 4 serviços + admin (`admin@demo.com`).
- [ ] Conectar via `psql` como `app_user` e tentar `SELECT * FROM appointments` sem `SET app.current_org_id` → retorna **0 linhas**.

**Arquivos:**

- `docker-compose.yml`
- `prisma/schema.prisma`
- `prisma/migrations/00000_rls_setup/migration.sql`
- `prisma/seed.ts`
- `src/lib/db.ts` (com `withTenant` helper)
- `.env.example`

**Para agentes Claude:**

1. Leia [03-modelo-dados.md](03-modelo-dados.md) inteiro antes.
2. Use `pnpm prisma migrate dev --name init` para gerar a migration inicial das tabelas; depois adicione manualmente a pasta `00000_rls_setup/` com o SQL de RLS.
3. NÃO use `prisma db push` em produção — `migrate` é o caminho. `db:push` é apenas alias para dev rápido inicial.
4. Implemente `withTenant(orgId, fn)` em `src/lib/db.ts` exatamente como documentado.
5. Teste manual obrigatório: rode os comandos do AC e cole o output na PR.

---

### PBI-02 — NextAuth v5 com Credentials + Prisma adapter

**Tags:** `[backend]` `[seguranca]`
**Estimativa:** 4h
**Depende de:** PBI-01

**Contexto:**
Auth para clientes finais e admins. Email + senha (bcrypt cost 12). Database sessions. NextAuth v5 (Auth.js).

**AC:**

- [ ] `pnpm add next-auth@beta @auth/prisma-adapter bcryptjs` (NextAuth v5 ainda em beta).
- [ ] `src/lib/auth.ts` exporta `auth`, `signIn`, `signOut`, `handlers` configurados.
- [ ] `src/app/api/auth/[...nextauth]/route.ts` exporta `GET`, `POST` de `handlers`.
- [ ] Login via `/login` com email+senha funciona.
- [ ] Sessão `Session` criada no banco; cookie `__Secure-...` em prod, normal em dev.
- [ ] Logout limpa sessão do banco + cookie.
- [ ] Cadastro via `/cadastro` cria `User`, dispara email de verificação (mock em dev, real em prod via Resend).
- [ ] Endpoint protegido `/admin/dashboard` redireciona para `/login?next=/admin/dashboard` se não autenticado.
- [ ] `auth()` em Server Component retorna `Session | null` com `user.id`, `user.email`, e (custom) `user.memberships: { organizationId, role }[]`.

**Arquivos:**

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/cadastro/page.tsx`
- `src/lib/validators/auth.ts`
- `src/types/auth.d.ts` (extends Session)
- `src/middleware.ts` (proteção de `(admin)`)

**Para agentes Claude:**

1. NextAuth v5 tem API diferente da v4 — consulte docs antes. `auth()` substitui `getServerSession`.
2. Use estratégia **database**, não JWT. Adapter Prisma cuida disso se configurado.
3. Custom `session.user.memberships` via callback `session()` que faz query no banco. Cache no callback pra não explodir queries.
4. Senha **sempre** hashada com `bcrypt.hash(password, 12)`. Comparação com `bcrypt.compare`.
5. Não logue senha em nenhum lugar (nem em error). Use `pino` redaction.

**Notas:** Google OAuth fica para PBI-03 separado para reduzir risco de uma PR grande.

---

### PBI-03 — Google OAuth + email de verificação

**Tags:** `[backend]` `[seguranca]`
**Estimativa:** 3h
**Depende de:** PBI-02

**Contexto:**
Adicionar Google como provider (clientes); implementar email de verificação via Resend para signups Credentials.

**AC:**

- [ ] Provider Google funcional (configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- [ ] Cadastro via Google cria `User` com `emailVerifiedAt` setado (Google verifica email).
- [ ] Cadastro via Credentials: `emailVerifiedAt` null, envia email com link `/verificar?token=...`.
- [ ] Clicar no link verifica → seta `emailVerifiedAt` → redireciona para `/login`.
- [ ] Email enviado via Resend; em dev, fallback para logar URL no console se `RESEND_API_KEY` não setado.

**Arquivos:**

- `src/lib/auth.ts` (adicionar Google provider)
- `src/lib/server/email/resend.ts`
- `src/app/(public)/verificar/page.tsx`
- `src/lib/server/auth/verification.ts` (gerar/verificar token via `VerificationToken`)

**Para agentes Claude:**

1. Use template HTML simples para email — sem dependência de React Email no MVP.
2. Token expira em 24h (`VerificationToken.expires`).
3. Idempotência: clicar 2x no link não dá erro, mostra "já verificado".

---

## D3 — CRUD admin

### PBI-04 — CRUD de serviços (admin)

**Tags:** `[frontend]` `[backend]`
**Estimativa:** 5h
**Depende de:** PBI-02

**Contexto:**
Owner cria/edita/desativa serviços da sua barbearia. Refer ver [W-09, W-10 em 08-prototipo.md](08-prototipo.md).

**AC:**

- [ ] `/admin/servicos` lista serviços da org ativa (apenas OWNER).
- [ ] Botão "Novo serviço" abre dialog/drawer com form.
- [ ] Form com nome (2-80 chars), descrição (opc, max 500), durationMinutes (5-240, múltiplo de 5), priceCents (0-100000), active (bool), professionalIds (multi-select dos profissionais da org).
- [ ] Validação Zod `createServiceSchema` em `src/lib/validators/service.ts`.
- [ ] Server Action `createService` / `updateService` / `deactivateService`.
- [ ] Não permitir delete hard se houver `appointment.serviceId` referenciando; em vez disso, força `active = false`.
- [ ] STAFF que tentar acessar `/admin/servicos` → 403 (sem botão de criar visível na UI mas defesa em profundidade no server).
- [ ] Testes: 1 unit (validator), 1 integration (Server Action com DB), 1 E2E (criar serviço).

**Arquivos:**

- `src/app/(admin)/servicos/page.tsx`
- `src/app/(admin)/servicos/actions.ts`
- `src/components/features/admin/ServiceForm.tsx`
- `src/components/features/admin/ServicesTable.tsx`
- `src/lib/validators/service.ts`
- `src/lib/server/services.ts`
- `tests/unit/validators/service.test.ts`
- `tests/integration/services.test.ts`
- `tests/e2e/admin-services.spec.ts`

**Para agentes Claude:**

1. Use `react-hook-form` + `zodResolver` no form. Shadcn `Form` wraps disso.
2. `priceCents` é integer no banco. UI mostra em R$ (divisão por 100). Use util `formatBRL(cents)` em `src/lib/utils.ts`.
3. Multi-select de profissionais → shadcn `Command` + `Popover` ou checkbox list, tanto faz no MVP.
4. Server Action começa com `await auth()` → checa role `OWNER` → senão throw `Error("Sem permissão")`.

---

### PBI-05 — CRUD de profissionais + horários de trabalho

**Tags:** `[frontend]` `[backend]`
**Estimativa:** 6h
**Depende de:** PBI-04

**Contexto:**
Owner cria profissionais e define horários por dia da semana. Ver [W-11 em 08-prototipo.md](08-prototipo.md).

**AC:**

- [ ] `/admin/profissionais` lista profissionais ativos da org.
- [ ] Criar/editar profissional: nome, bio, foto (URL — upload é v2), `serviceIds` (que serviços faz), active.
- [ ] Detalhe `/admin/profissionais/[id]` mostra horários da semana.
- [ ] Editar horários: adicionar/remover faixas por weekday. Validar: `startMinute < endMinute`, sem sobreposição entre faixas do mesmo weekday, ambos `% 5 === 0`.
- [ ] Bloqueios futuros (`TimeBlock`): criar/listar/remover.
- [ ] Server Actions com validação Zod.
- [ ] Testes: validator, integration (criar profissional + horários), E2E (editar horário).

**Arquivos:**

- `src/app/(admin)/profissionais/page.tsx`
- `src/app/(admin)/profissionais/[id]/page.tsx`
- `src/app/(admin)/profissionais/actions.ts`
- `src/components/features/admin/ProfessionalForm.tsx`
- `src/components/features/admin/WorkingHoursEditor.tsx`
- `src/components/features/admin/TimeBlockManager.tsx`
- `src/lib/validators/professional.ts`
- `src/lib/server/professionals.ts`
- testes correspondentes

**Para agentes Claude:**

1. `Weekday` enum no Prisma → `["SUN", "MON", ...]`. UI mostra "Segunda", etc.
2. Editor de horários: mostrar 7 linhas (dom-sab), cada uma com lista de faixas + botão "+ faixa". Validar antes de salvar.
3. Atomicidade: salvar profissional + horários numa transação.

---

## D4 — Fluxo cliente

### PBI-06 — Slot calculator (algoritmo de slots disponíveis)

**Tags:** `[backend]` `[testes]`
**Estimativa:** 5h
**Depende de:** PBI-05

**Contexto:**
Função pura que, dado profissional + serviço + data, devolve lista de slots disponíveis. **Coração do produto.** Implementa RN-03, RN-04, RN-05.

**AC:**

- [ ] Função `calculateAvailableSlots({ workingHours, existingAppointments, blocks, durationMinutes, date, timezone, minAdvanceMinutes })` em `src/lib/server/slot-calculator.ts`.
- [ ] Retorna `Array<{ startMinute: number; startUtc: Date }>`.
- [ ] Cobre todas as regras: dentro do horário de trabalho, sem conflito, sem bloqueio, antecedência mínima, range fim caber no expediente.
- [ ] **15+ testes unit** cobrindo casos: dia normal, sem horário no weekday, com bloqueios, com appointments, no limite do expediente, antecedência exata 30min, etc.
- [ ] Função separada `getAvailableSlots({ organizationId, professionalId, serviceId, date })` em `src/lib/server/booking-service.ts` que carrega dados do banco e chama `calculateAvailableSlots`.

**Arquivos:**

- `src/lib/server/slot-calculator.ts`
- `src/lib/server/booking-service.ts`
- `tests/unit/lib/slot-calculator.test.ts`
- `tests/integration/booking-service.test.ts`

**Para agentes Claude:**

1. Função em `slot-calculator.ts` deve ser **pura** (sem I/O, sem Date.now() escondido). Receba `now` como parâmetro com default `new Date()`.
2. Trabalhe em **minutos desde 00:00 local** internamente — converta para UTC só na saída (`startUtc`).
3. Use `date-fns-tz` para conversão. `zonedTimeToUtc(localDate, timezone)`.
4. Step (granularidade) padrão **15 min**. Configurável via param.
5. Performance: para 1 dia, é trivial. Evite alocação desnecessária mas sem premature optimization.
6. Casos de teste: copie a lista do AC e adicione mais 5 edge cases que você imaginar.

---

### PBI-07 — Fluxo cliente: serviço → profissional → horário (UI sem submit)

**Tags:** `[frontend]`
**Estimativa:** 5h
**Depende de:** PBI-06

**Contexto:**
Implementar W-01, W-02, W-03, W-04 do protótipo. Stateful via URL search params (sem global state). Não submete ainda — submit em PBI-08.

**AC:**

- [ ] `/[orgSlug]` mostra landing W-01 com serviços e profissionais reais (data do banco via `getOrgBySlug`).
- [ ] `/[orgSlug]/agendar` mostra picker de serviços (W-02). Selecionar → `?serviceId=...&continue` redireciona para próxima.
- [ ] `/[orgSlug]/agendar/profissional?serviceId=X` mostra profissionais que fazem o serviço + opção "qualquer". Selecionar → redireciona.
- [ ] `/[orgSlug]/agendar/horario?serviceId=X&professionalId=Y` mostra calendário + slots disponíveis (chama `getAvailableSlots`).
- [ ] Calendário usa shadcn `Calendar`. Dias passados desabilitados. Dias além da janela (60 dias) desabilitados.
- [ ] Indicador "Passo N/4".
- [ ] Mobile-first; usar `<main>` com `max-w-md mx-auto` ou similar.

**Arquivos:**

- `src/app/(public)/[orgSlug]/page.tsx`
- `src/app/(public)/[orgSlug]/agendar/page.tsx`
- `src/app/(public)/[orgSlug]/agendar/profissional/page.tsx`
- `src/app/(public)/[orgSlug]/agendar/horario/page.tsx`
- `src/components/features/booking/ServicePicker.tsx`
- `src/components/features/booking/ProfessionalPicker.tsx`
- `src/components/features/booking/SlotPicker.tsx`
- `src/components/features/booking/StepIndicator.tsx`
- `src/lib/server/orgs.ts`

**Para agentes Claude:**

1. State entre passos via URL params (`?serviceId=...&professionalId=...`). Sem cookies, sem localStorage.
2. RSC por padrão. Pickers podem ser client se precisar de loading state, mas tente server primeiro.
3. Resolução de `orgSlug` → `Organization` em util `getOrgBySlug` no `lib/server/orgs.ts`. Cachear via `unstable_cache` se preciso (slug é estável).
4. Teste E2E vai em PBI-08 quando o fluxo fechar.

---

### PBI-08 — Confirmação + criação do agendamento

**Tags:** `[frontend]` `[backend]` `[seguranca]`
**Estimativa:** 5h
**Depende de:** PBI-07, PBI-03

**Contexto:**
Fechar o fluxo: form de confirmação (W-05), Server Action que valida + cria, redirect para confirmação (W-06), email de notificação.

**AC:**

- [ ] `/[orgSlug]/agendar/confirmar?serviceId=X&professionalId=Y&startsAt=Z` mostra resumo + form (nome, telefone, email).
- [ ] Se usuário logado, pré-preencher nome/email.
- [ ] Server Action `confirmBookingAction(formData)`:
  - Parse Zod.
  - Resolve org via slug.
  - Verifica slot ainda livre (chama `calculateAvailableSlots` novamente — defesa contra race).
  - Se usuário não logado, cria `User` com `emailVerifiedAt = null` (envia email de verificação separado).
  - Cria `Appointment` em transação com RLS.
  - Envia email de confirmação via Resend.
  - `revalidatePath`.
  - Redireciona para `/[orgSlug]/agendamento/[id]`.
- [ ] Página de confirmação `/[orgSlug]/agendamento/[id]` (W-06) com detalhes do appointment.
- [ ] Tratamento de erros:
  - Slot ocupado → mensagem "Esse horário acabou de ser pego. Escolha outro" + botão voltar.
  - Validação → mensagens inline nos campos.
- [ ] Testes E2E: fluxo feliz + fluxo com slot ocupado entre passos.

**Arquivos:**

- `src/app/(public)/[orgSlug]/agendar/confirmar/page.tsx`
- `src/app/(public)/[orgSlug]/agendar/confirmar/actions.ts`
- `src/app/(public)/[orgSlug]/agendamento/[id]/page.tsx`
- `src/lib/validators/booking.ts`
- `src/lib/server/booking-service.ts` (estender com `createBooking`)
- `src/lib/server/email/booking-confirmation.ts`
- `tests/e2e/client-booking.spec.ts`

**Para agentes Claude:**

1. **Idempotência:** se o usuário submeter 2x (clique duplo), não criar 2 appointments. Use unique constraint informal via "transação + check" ou debounce client + spinner no botão.
2. **Defesa em profundidade:** EXCLUDE constraint do Postgres é o backstop. Se a Server Action capturar erro `P2002`/`23P01`, mostre mensagem amigável.
3. Email é fire-and-forget (`await` mas não bloqueia confirmação se falhar) — log erro mas devolve sucesso. Cliente recebe na próxima retry de email (v2: fila).

---

## D5 — Painel admin

### PBI-09 — Agenda do dia (admin)

**Tags:** `[frontend]` `[backend]`
**Estimativa:** 6h
**Depende de:** PBI-08

**Contexto:**
W-08: visualização de agenda do dia por profissional, com appointments e bloqueios. Clicar em bloco → detalhes/ações.

**AC:**

- [ ] `/admin/agenda?date=YYYY-MM-DD` mostra agenda do dia da org logada.
- [ ] OWNER vê todos os profissionais; STAFF vê só própria coluna.
- [ ] Colunas = profissionais ativos (max 8 visíveis no desktop; tabs no mobile).
- [ ] Linhas = horário (granularidade 30 min visual, mas blocos têm tamanho real).
- [ ] Cada `Appointment` `CONFIRMED` → bloco colorido com hora + nome + serviço.
- [ ] Cada `TimeBlock` → bloco hachurado cinza.
- [ ] Clicar em appointment → `Dialog` com detalhes + ações: marcar `COMPLETED`, `NO_SHOW`, `CANCELLED`.
- [ ] Clicar em slot livre → `Dialog` "Criar agendamento manual" (encaixe).
- [ ] Navegação ◀ Hoje ▶ via querystring.
- [ ] Toggle Dia / Semana (semana v2 — botão desabilitado).

**Arquivos:**

- `src/app/(admin)/agenda/page.tsx`
- `src/app/(admin)/agenda/actions.ts`
- `src/components/features/admin/AgendaDayView.tsx`
- `src/components/features/admin/AppointmentDetailDialog.tsx`
- `src/components/features/admin/QuickBookingDialog.tsx`
- `src/lib/server/agenda.ts`

**Para agentes Claude:**

1. Layout: CSS grid com colunas dinâmicas (`grid-template-columns: repeat(N, 1fr)` onde N = nº de profissionais).
2. Hora atual: linha horizontal vermelha cruzando a grid (se hoje).
3. Marcar `CANCELLED`: pedir razão (textarea) se for < 2h antes do `startsAt`.
4. Encaixe (`QuickBookingDialog`): igual ao fluxo cliente mas com `force: true` no service call — pula validação de antecedência. Conflito de tempo ainda barra.

---

### PBI-10 — Configurações da organização

**Tags:** `[frontend]` `[backend]`
**Estimativa:** 3h
**Depende de:** PBI-02

**Contexto:**
Owner edita dados básicos da org: nome, slug (com cuidado — afeta URLs), fuso (read-only no MVP, mostra "America/Sao_Paulo"), `allowGuestBooking` (bool).

**AC:**

- [ ] `/admin/configuracoes` form com campos editáveis.
- [ ] Mudar slug: confirmação obrigatória (modal "isso vai mudar a URL pública").
- [ ] Validação: slug `kebab-case`, 3-50 chars, unique.
- [ ] Server Action `updateOrganization` (OWNER apenas).

**Arquivos:**

- `src/app/(admin)/configuracoes/page.tsx`
- `src/app/(admin)/configuracoes/actions.ts`
- `src/lib/validators/organization.ts`

---

## D6 — Qualidade + CI

### PBI-11 — Testes de isolamento cross-tenant

**Tags:** `[testes]` `[seguranca]`
**Estimativa:** 4h
**Depende de:** PBI-09

**Contexto:**
Bug mais crítico que podemos ter = vazar dados entre tenants. Testes E2E + integration que **explicitamente** tentam acessar/modificar dados de outra org.

**AC:**

- [ ] `tests/integration/tenant-isolation.test.ts` cobre:
  - Query de org A não retorna dados de org B (já existe — completar).
  - INSERT em org A com `organizationId` de org B é rejeitado.
  - UPDATE de recurso de org B (referenciado por ID conhecido) silencia (RLS).
  - Sem `SET app.current_org_id`, queries retornam vazio.
- [ ] `tests/e2e/security/cross-tenant-leak.spec.ts`:
  - Login como owner de orgA → acessa URL direta `/admin/agendamentos/<id-de-orgB>` → 404.
  - API route equivalente retorna 404 (não 403, para não vazar existência).
- [ ] Esses testes rodam em **toda PR** (não só na main).

**Arquivos:**

- `tests/integration/tenant-isolation.test.ts` (expandir)
- `tests/e2e/security/cross-tenant-leak.spec.ts` (novo)
- `tests/e2e/fixtures/two-orgs.ts` (helper que cria 2 orgs com 1 appointment cada)

**Para agentes Claude:**

1. Use Playwright fixtures para reuso entre testes de segurança.
2. 404 vs 403: deliberadamente 404 — não queremos vazar "existe esse recurso, mas você não pode".
3. Não pule esse PBI mesmo que o tempo esteja apertado. Sem isso, o multi-tenant é teatro.

---

### PBI-12 — Suite de testes unit/integration mínima + coverage gates

**Tags:** `[testes]`
**Estimativa:** 4h
**Depende de:** PBI-08

**Contexto:**
Cobertura mínima conforme [05-testes.md](05-testes.md). Configurar Vitest com `c8` (built-in V8 coverage), reporter para CI.

**AC:**

- [ ] `vitest.config.ts` configurado com coverage.
- [ ] Coverage threshold global: 70% lines, 70% statements.
- [ ] Coverage por path: `src/lib/server/**` 85%, `src/lib/validators/**` 95%.
- [ ] Falha de threshold quebra CI.
- [ ] `pnpm test:coverage` gera report HTML em `coverage/`.
- [ ] Testes unit mínimos: validators (8+), slot-calculator (15+), utils (cobertura completa de `formatBRL`, `cn`).
- [ ] Testes integration: booking-service (5+ casos), tenant-isolation (já em PBI-11), auth flow básico.

---

### PBI-13 — CI no GitHub Actions

**Tags:** `[infra]` `[testes]`
**Estimativa:** 3h
**Depende de:** PBI-12

**Contexto:**
Pipeline que roda em toda PR: install, typecheck, lint, test, integration (com Postgres em container), E2E (Playwright). Bloqueia merge se vermelho.

**AC:**

- [ ] `.github/workflows/ci.yml` com jobs:
  1. `lint-typecheck` (rápido, falha early)
  2. `test-unit` (Vitest, coverage)
  3. `test-integration` (sobe Postgres via service, roda migrações, testa)
  4. `test-e2e` (Playwright, cobre fluxos críticos)
- [ ] Cache de `pnpm store` e `node_modules` para acelerar.
- [ ] Comentário automático com coverage diff em PR (via `c8` JSON + action).
- [ ] Branch protection: require CI passing antes de merge para `main`.

**Arquivos:**

- `.github/workflows/ci.yml`
- `docker-compose.test.yml` (Postgres com config dedicada)
- README atualizado com badges de CI

---

## D7 — Polish + deploy

### PBI-14 — Deploy Vercel + Neon (produção)

**Tags:** `[infra]`
**Estimativa:** 3h
**Depende de:** PBI-13

**Contexto:**
Deploy do MVP em produção: Vercel (Next.js) + Neon (Postgres). Domínio temporário `.vercel.app` no MVP — domínio customizado em v2.

**AC:**

- [ ] Projeto criado no Vercel apontando para `main`.
- [ ] Neon project criado, banch `main` ↔ Vercel prod, branch `dev` para preview.
- [ ] Variáveis de ambiente configuradas no Vercel (produção + preview).
- [ ] Build verde no primeiro deploy.
- [ ] Migrations rodadas em prod via `pnpm db:migrate deploy` (no build step ou job dedicado).
- [ ] Smoke test manual em prod: cadastrar barbearia teste, fazer agendamento, login admin, ver agenda.
- [ ] Health check `/api/health` retorna 200 + status do banco.

**Arquivos:**

- `vercel.json` (se precisar custom)
- `src/app/api/health/route.ts`
- README com instruções de deploy

---

### PBI-15 — PWA + polimento UX

**Tags:** `[frontend]`
**Estimativa:** 3h
**Depende de:** PBI-08

**Contexto:**
Manifest PWA, ícones, meta tags para compartilhamento, favicon, loading states, empty states.

**AC:**

- [ ] `public/manifest.json` configurado.
- [ ] Ícones 192x192 e 512x512 em `public/icons/`.
- [ ] `metadata` no root layout com `openGraph`, `twitter`.
- [ ] Service worker básico via `next-pwa` ou implementação manual (offline = "sem internet").
- [ ] Skeleton loader em todas as listagens (não spinner).
- [ ] Empty state em listas vazias com CTA de criar primeiro item.
- [ ] Mensagens de erro PT-BR sem stack trace.
- [ ] Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90.

---

## Backlog futuro (NÃO MVP — não pegar nesta semana)

- Lembrete por WhatsApp (Cloud API)
- Pagamento online (Stripe / Mercado Pago)
- Comissões por profissional
- Relatórios (BI)
- App nativo (React Native)
- Multi-idioma
- Customização visual por tenant
- Onboarding self-service com billing
- Programa de fidelidade
- Avaliações pós-atendimento
- Marketplace (descoberta cross-tenant)
- Integração Google Calendar

---

## Resumo da semana (visão de PBIs)

| Dia | PBIs | Foco |
|---|---|---|
| D1 (hoje) | docs + scaffold | Fundação |
| D2 | PBI-01, PBI-02, PBI-03 | Banco + auth |
| D3 | PBI-04, PBI-05 | CRUD admin |
| D4 | PBI-06, PBI-07, PBI-08 | Fluxo cliente |
| D5 | PBI-09, PBI-10 | Agenda admin |
| D6 | PBI-11, PBI-12, PBI-13 | Qualidade + CI |
| D7 | PBI-14, PBI-15 | Deploy + polish |

Total: **15 PBIs**, estimativa somada ~62h. Time misto (~3 humanos + 2 agentes) → ~12h efetivas/dia → cabe se for paralelizado e não houver bloqueio.

Cronograma detalhado em [10-plano-semana.md](10-plano-semana.md).
