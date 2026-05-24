# 11 — PBIs em formato Trello (back / front / regra / testes / deploy)

> **Por que esse doc existe?** As telas já vieram prontas dos protótipos (`prototypes/*.html` + `src/app/admin/*`). Devs vão "pegar a tela" e ligar no back. Esse doc separa **o que o card pega** em cinco frentes para evitar PR Frankenstein.
>
> - **🔧 Backend** — Server Actions, queries, validações, migrações, infra.
> - **🎨 Frontend** — wire da tela existente (forms, estados, navegação, error boundaries).
> - **📜 Regra de negócio** — quais RN-XX desta PBI implementa; what to *not* let through.
> - **🧪 Testes** — unit / integration / E2E que precisam viver na mesma PR.
> - **🚀 Deploy** — gates local → preview Vercel (= dev) → prod automático após merge em `main`.
>
> Fontes: [09-pbis.md](09-pbis.md) (canônico), [07-regras-negocio.md](07-regras-negocio.md), [03-modelo-dados.md](03-modelo-dados.md), [04-seguranca.md](04-seguranca.md), [wiki/fluxo-desenvolvimento.md](wiki/fluxo-desenvolvimento.md).
> Diagramas: [fluxo-cliente.svg](diagramas/fluxo-cliente.svg) · [fluxo-admin.svg](diagramas/fluxo-admin.svg) · [arquitetura-multi-tenant.svg](diagramas/arquitetura-multi-tenant.svg) · [algoritmo-slot-calculator.svg](diagramas/algoritmo-slot-calculator.svg) · [fluxo-dev-prod.svg](diagramas/fluxo-dev-prod.svg) · [mapa-mental.svg](diagramas/mapa-mental.svg).

## Convenção dos cards

| Campo | Valor |
|---|---|
| **Lista inicial** | Backlog |
| **Labels** | `backend`, `frontend`, `infra`, `seguranca`, `testes`, `docs` + prioridade (`p0`/`p1`/`p2`) |
| **Checklist** | 4 fixos: `🔧 Backend`, `🎨 Frontend`, `📜 Regra de negócio`, `🧪 Testes` |
| **DoD universal** | (vale para todos — ver [09-pbis.md §DoD](09-pbis.md)) |
| **Owner** | atribuir só ao mover para `Doing` |

## 🚀 Deploy padrão (vale para TODA PBI)

> Detalhes em [wiki/fluxo-desenvolvimento.md](wiki/fluxo-desenvolvimento.md). Trunk-based + Vercel preview por PR + deploy prod automático ao merger em `main`.

Cada PBI tem o mesmo checklist 🚀 — em vez de repetir 15x abaixo, abaixo de cada PBI listo só **variações específicas** (ex: PBI-01 não tem screenshot; PBI-14 redefine smoke). Quando a seção 🚀 da PBI disser "padrão", aplique este checklist:

```markdown
- [ ] `pnpm typecheck && pnpm lint && pnpm test:run` verde local
- [ ] Branch `feat/<slug-da-pbi>` criada de `main` atualizado
- [ ] PR aberta → CI verde + Vercel preview URL no PR
- [ ] Smoke da feature no preview (compartilhar URL no canal)
- [ ] Screenshot/vídeo no PR body (se mudou UI)
- [ ] Reviewer aprovou (2 se mexe em prisma/auth/middleware/RLS)
- [ ] Squash merge em main → deploy prod automático
- [ ] Smoke prod: /api/health 200 + fluxo crítico da PBI funciona
- [ ] Card Trello movido para Concluído
- [ ] Cliente avisado no canal (se feature visível)
```

Tempo típico de uma PBI: local 30 min – 6h, review + smoke ~30 min.

## Estado atual do código (snapshot 2026-05-23)

```
src/
  app/
    (public)/[orgSlug]/...   ← telas cliente já existem (mock data)
    admin/{agenda,configuracoes,dashboard,profissionais,servicos}/  ← telas admin já existem (mock data)
  components/{features/booking, ui}/
  lib/{mock-data.ts, utils.ts}   ← sem db.ts, sem auth.ts, sem validators/, sem server/
prototypes/*.html               ← 5 variações visuais de referência
prisma/                          ← NÃO CRIADO AINDA (PBI-01)
tests/                           ← NÃO CRIADO AINDA (PBI-06)
docs/                            ← este diretório (referência)
```

Implicações práticas:

- **Toda PBI de back** começa instalando o que falta (Prisma client, helpers, etc.) e plugando na rota que **já existe**.
- **Toda PBI de front** é remover `mock-data.ts` dos componentes da feature daquela PBI e trocar pela Server Action / loader real.
- **Testes não existem ainda** — PBI-06 puxa a infra Vitest/Playwright junto.

---

## D2 — Fundação técnica

### PBI-01 — Postgres local + RLS + migration inicial

**Labels:** `infra` `backend` `seguranca` `p0`
**Estimativa:** 2h · **Depende:** scaffold (já)
**Doc canônico:** [09-pbis.md#PBI-01](09-pbis.md) · [03-modelo-dados.md](03-modelo-dados.md)

#### 🔧 Backend
- [ ] `docker-compose.yml` com Postgres 16, volume persistente, port 5432.
- [ ] `prisma/schema.prisma` com todos os models de [03-modelo-dados.md](03-modelo-dados.md) (Organization, User, Membership, Service, Professional, ProfessionalService, WorkingHours, TimeBlock, Appointment, Account, Session, VerificationToken).
- [ ] `pnpm prisma migrate dev --name init` gera migration de tabelas/índices.
- [ ] `prisma/migrations/00000_rls_setup/migration.sql` (manual) — roles `app_user`/`app_migrator`/`app_superuser`, `CREATE EXTENSION btree_gist`, `current_org_id()`, policies `tenant_isolation` em 7 tabelas, `FORCE ROW LEVEL SECURITY`, `EXCLUDE no_overlap_per_professional`.
- [ ] `prisma/seed.ts` — Org "Barbearia Demo", 2 profs, 4 serviços, 1 admin `admin@demo.com`/`senha123`, WorkingHours seg-sex 09–19h, 3 Appointments futuros.
- [ ] `src/lib/db.ts` com `withTenant(orgId, fn)` exato conforme [03-modelo-dados.md#patterns-de-query](03-modelo-dados.md).
- [ ] `.env.example` com `DATABASE_URL`, `DIRECT_URL`, `DATABASE_ADMIN_URL`.

#### 🎨 Frontend
- *(nada — esta PBI é puramente infra)*

#### 📜 Regra de negócio
- RN-04: EXCLUDE constraint é a defesa final contra dois confirmados sobrepostos.
- RN-13: timezone default `America/Sao_Paulo`; banco salva `timestamptz` em UTC.
- Arquitetura: ver [diagramas/arquitetura-multi-tenant.svg](diagramas/arquitetura-multi-tenant.svg).

#### 🧪 Testes
- [ ] Manual obrigatório: conectar via `psql` como `app_user` sem `SET app.current_org_id` → `SELECT * FROM appointments` deve retornar **0 linhas**. Cole o output na PR.
- [ ] Manual: rodar `pnpm db:seed` 2x → idempotente (não duplica).
- [ ] (Automated entra em PBI-11; aqui só smoke manual.)

#### 🚀 Deploy
Padrão (ver topo). **Variações:** sem screenshot (infra). Smoke prod = `psql` no Neon com `app_user` confirmando 0 rows sem `SET app.current_org_id`. Sem aviso ao cliente (invisível).

---

### PBI-02 — NextAuth v5 (Credentials + Prisma adapter)

**Labels:** `backend` `seguranca` `frontend` `p0`
**Estimativa:** 4h · **Depende:** PBI-01

#### 🔧 Backend
- [ ] `pnpm add next-auth@beta @auth/prisma-adapter bcryptjs`.
- [ ] `src/lib/auth.ts` exporta `auth`, `signIn`, `signOut`, `handlers` (estratégia **database**, não JWT).
- [ ] `src/app/api/auth/[...nextauth]/route.ts` re-exporta `GET`, `POST`.
- [ ] Callback `session()` que enriquece `user.memberships: { organizationId, role, professionalId? }[]`.
- [ ] `src/lib/validators/auth.ts` — `loginSchema`, `signupSchema`.
- [ ] `src/middleware.ts` — protege `(admin)/*`, redirect `?next=…`.
- [ ] `src/types/auth.d.ts` — augment `Session`/`User`.
- [ ] Senha sempre `bcrypt.hash(pwd, 12)`; comparar com `bcrypt.compare`. **Nunca** logar senha (pino redaction).

#### 🎨 Frontend
- [ ] Ligar tela existente de `/login` ao server action `signIn("credentials", …)`.
- [ ] Ligar tela existente de `/cadastro` ao SA de signup → cria `User` → manda verificar email (PBI-03 implementa o envio; aqui mock console).
- [ ] Estados: loading no submit, erro inline ("Email ou senha inválidos"), redirect `?next` após sucesso.
- [ ] Logout button no header admin → `signOut()`.

#### 📜 Regra de negócio
- RN-14: visibilidade por role — OWNER/STAFF check em middleware + nas SAs (defesa em profundidade).
- RN-CB-04: email duplicado → mensagem amigável "use esqueci senha".
- RN-17: onboarding self-service é v2 — admin é seedado.

#### 🧪 Testes
- [ ] Unit: `loginSchema`/`signupSchema` (válido / email malformado / senha curta).
- [ ] Integration: signup cria User com `passwordHash` (assert hash, não plain), `emailVerifiedAt = null`.
- [ ] Integration: login rejeita senha errada com mesma mensagem do email errado (sem oracle).
- [ ] E2E feliz: signup → login → redirect dashboard.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot tela de login. Smoke prod = login `admin@demo.com` → `/admin/dashboard` carrega. Avisa cliente (primeira PBI com fluxo visível).

---

### PBI-03 — Google OAuth + verificação de email (Resend)

**Labels:** `backend` `seguranca` `p1`
**Estimativa:** 3h · **Depende:** PBI-02

#### 🔧 Backend
- [ ] Provider Google em `src/lib/auth.ts` (env: `GOOGLE_CLIENT_ID/SECRET`).
- [ ] Login Google → cria User com `emailVerifiedAt = now()` (Google já valida).
- [ ] `src/lib/server/email/resend.ts` — cliente Resend; fallback dev: `console.log(url)` se `RESEND_API_KEY` ausente.
- [ ] `src/lib/server/auth/verification.ts` — gera `VerificationToken` (24h expira), valida e seta `emailVerifiedAt`.
- [ ] Rota `/verificar?token=…` em `src/app/(public)/verificar/page.tsx`.

#### 🎨 Frontend
- [ ] Botão "Entrar com Google" na tela de login existente.
- [ ] Página `/verificar` — feedback "Verificado ✓ → ir para login" ou "Link expirado".
- [ ] Idempotência: clicar 2x no link → "já verificado", sem erro.

#### 📜 Regra de negócio
- RN-15: emails transacionais via Resend; from `agendamentos@barbearia.app` em prod.
- Token de verificação 24h; token de reset (v2) 1h.

#### 🧪 Testes
- [ ] Unit: gerar token retorna identificador + expira em 24h ± 1s.
- [ ] Integration: verificar token válido seta `emailVerifiedAt`; expirado retorna erro; já usado retorna "já verificado".
- [ ] E2E (mock Resend): signup → captura console URL → GET URL → emailVerified.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** smoke prod = signup com email real → recebe email Resend → clica link → verificado. Configurar `RESEND_API_KEY` no Vercel scope `Production` antes do merge.

---

## D3 — CRUD admin

### PBI-04 — CRUD serviços (admin)

**Labels:** `frontend` `backend` `p0`
**Estimativa:** 5h · **Depende:** PBI-02
**Tela:** `src/app/admin/servicos/` (já existe com mock)

#### 🔧 Backend
- [ ] `src/lib/validators/service.ts` — `createServiceSchema`, `updateServiceSchema`:
  - `name` 2–80, `description?` ≤500, `durationMinutes` 5–240 múltiplo de 5, `priceCents` 0–100000, `active` bool, `professionalIds: string[]`.
- [ ] `src/lib/server/services.ts` — `listServices(orgId)`, `createService`, `updateService`, `deactivateService` (todas via `withTenant`).
- [ ] `src/app/admin/servicos/actions.ts` — Server Actions: parse Zod → checa role OWNER → chama service.
- [ ] Soft-disable: hard delete bloqueado se há `Appointment` referenciando → set `active = false`.
- [ ] STAFF tentando SA → throw `Error("Sem permissão")` (status 403 no client).

#### 🎨 Frontend
- [ ] Trocar mock por loader real (RSC busca via `listServices(orgId)`).
- [ ] `ServiceForm.tsx` usa `react-hook-form` + `zodResolver(createServiceSchema)`.
- [ ] `ServicesTable.tsx` — colunas: nome, duração, preço (formatado `formatBRL`), ativo (badge), ações (editar/desativar).
- [ ] Multi-select de profissionais — shadcn `Command + Popover` ou checkbox list.
- [ ] STAFF não vê botão "Novo serviço" (defesa também no server).
- [ ] Empty state "Nenhum serviço — criar o primeiro" com CTA.

#### 📜 Regra de negócio
- RN-02: duração fixa, sempre múltiplo de 5.
- RN-18: sem limite hard de serviços; UI sugere ≤50.
- RN-19: editar preço afeta novos agendamentos; existentes não têm snapshot no MVP.

#### 🧪 Testes
- [ ] Unit: `createServiceSchema` — duração 7 falha (não múltiplo), 0 falha, 245 falha; nome vazio falha; nome 81 chars falha; preço negativo falha.
- [ ] Integration: `createService` insere com `organizationId` correto; com STAFF lança erro de role.
- [ ] Integration: `deactivateService` em serviço com Appointment → marca `active=false` (não deleta).
- [ ] E2E: OWNER cria serviço → aparece na lista; STAFF acessa `/admin/servicos` → 403.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot do modal de criar serviço. Smoke prod = OWNER demo cria serviço de teste e desativa em seguida (não suja dados reais). Avisa cliente.

---

### PBI-05 — CRUD profissionais + horários + bloqueios

**Labels:** `frontend` `backend` `p0`
**Estimativa:** 6h · **Depende:** PBI-04
**Tela:** `src/app/admin/profissionais/` (já existe com mock)

#### 🔧 Backend
- [ ] `src/lib/validators/professional.ts` — `professionalSchema` (name 2–80, bio? ≤500, photoUrl? URL, serviceIds[], active).
- [ ] `workingHoursSchema` — `weekday`, `startMinute`/`endMinute` 0–1440 múltiplo 5, `startMinute < endMinute`; valida sem sobreposição entre faixas do mesmo weekday no array.
- [ ] `timeBlockSchema` — `startsAt < endsAt`; rejeitar se sobrepor Appointment CONFIRMED do prof (consulta antes de inserir → erro com lista de conflitos).
- [ ] `src/lib/server/professionals.ts` — CRUD + `setWorkingHours(profId, hours[])` que apaga e reinsere **em transação** (atômico).
- [ ] `src/app/admin/profissionais/actions.ts` — SAs com role check OWNER.

#### 🎨 Frontend
- [ ] Ligar lista `/admin/profissionais` ao loader real.
- [ ] Detalhe `/admin/profissionais/[id]` — `ProfessionalForm` + `WorkingHoursEditor` + `TimeBlockManager`.
- [ ] `WorkingHoursEditor` — 7 linhas (Dom→Sáb), botão "+ faixa", input HH:MM convertido para minutos no submit.
- [ ] Validação client-side antes do submit: feedback inline em cima da faixa problemática.
- [ ] `TimeBlockManager` — listar bloqueios futuros, criar (date range + reason), deletar.

#### 📜 Regra de negócio
- RN-01: sem WorkingHours num weekday → prof não atende nesse dia.
- RN-10: TimeBlock que sobrepõe Appointment CONFIRMED → rejeitar.
- RN-CB-03: desativar profissional com appointments futuros — alertar, não cancela automaticamente.

#### 🧪 Testes
- [ ] Unit: `workingHoursSchema` — sobreposição [9:00–12:00] + [11:00–13:00] mesmo weekday → falha; faixas disjuntas passam.
- [ ] Unit: `timeBlockSchema` — start ≥ end → falha.
- [ ] Integration: `setWorkingHours` é atômico — se 2ª faixa inválida, 1ª não fica salva.
- [ ] Integration: criar TimeBlock sobrepondo Appointment → erro com IDs dos conflitos.
- [ ] E2E: criar prof → adicionar 2 faixas seg → ver na lista → bloquear amanhã 12-13h.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot do editor de WorkingHours. Smoke prod = OWNER demo cria prof teste com 1 faixa seg e bloqueio amanhã; depois apaga. Avisa cliente.

---

## D4 — Fluxo cliente

### PBI-06 — Slot calculator (coração do produto)

**Labels:** `backend` `testes` `p0`
**Estimativa:** 5h · **Depende:** PBI-05
**Diagrama:** [algoritmo-slot-calculator.svg](diagramas/algoritmo-slot-calculator.svg)

#### 🔧 Backend
- [ ] `src/lib/server/slot-calculator.ts` — função **pura** `calculateAvailableSlots({ workingHours, existingAppointments, blocks, durationMinutes, date, timezone, minAdvanceMinutes, now=new Date(), step=15 })` → `Array<{ startMinute, startUtc }>`.
- [ ] Trabalha em minutos locais; converte UTC só na saída (`date-fns-tz`).
- [ ] `now` injetável (sem `Date.now()` escondido).
- [ ] `src/lib/server/booking-service.ts#getAvailableSlots({ orgId, professionalId, serviceId, date })` — carrega dados via `withTenant` e chama a função pura.
- [ ] Configurar Vitest + setup (PBI-12 estende com coverage).

#### 🎨 Frontend
- *(consumido em PBI-07)*

#### 📜 Regra de negócio
- RN-03(1..5): horário, fim cabe, sem conflito appt, sem block, antecedência.
- RN-04: app-side dedupe (Postgres EXCLUDE é o backstop).
- RN-05: 30min default, 0 com `force` (admin).
- RN-06: cap 60 dias futuros (validar na borda, não dentro do calculator).
- RN-CB-01: range `[)` — terminar 10:00 e começar 10:00 não conflita.

#### 🧪 Testes (PBI-06 obriga 15+ no calculator)
- [ ] Dia normal, 1 faixa, sem nada → N slots a cada 15min.
- [ ] Sem WorkingHours no weekday → `[]`.
- [ ] Faixa 9–12, duration 60, step 15 → slots 9:00, 9:15, …, 11:00 (11:00+60=12:00 cabe).
- [ ] Mesma faixa, duration 75 → último slot 10:45 (10:45+75=12:00).
- [ ] Bloqueio cobrindo 11:00–11:30 elimina slots que cruzam.
- [ ] Appointment 10:00–10:30 elimina 9:45, 10:00, 10:15 (com duration 30).
- [ ] Slot terminando exatamente 12:00 com faixa fim 12:00 → válido.
- [ ] Próximo após appointment que termina 10:00 → 10:00 válido (range `[)`).
- [ ] Antecedência: now=09:30, minAdvance=30 → 09:30 falha (igual), 10:00 passa, 09:45 passa? (10:00 ≥ 09:30+30 = 10:00 ✓).
- [ ] Antecedência 31: 10:00 falha (10:00 ≥ 10:01? não).
- [ ] Fuso: data 2026-06-01 em SP → primeiro slot 09:00 local = 12:00 UTC.
- [ ] Múltiplas faixas (9–12 + 14–18): pula 12:00–14:00 e retoma.
- [ ] Step 30 com duration 30 → slots 9:00, 9:30, 10:00…
- [ ] Slots crescem monotonicamente (asserção sobre output).
- [ ] Duration 0 ou negativa → `throw` com mensagem clara.
- [ ] (Integration em booking-service.test.ts: carrega de db real com `withTenant` e devolve mesmo resultado do unit equivalente.)

#### 🚀 Deploy
Padrão (ver topo). **Variações:** sem screenshot (função pura, sem UI). Smoke prod = nada visível mudou — confirmar via `GET /api/health` + 1 booking de teste consome a função. Sem aviso ao cliente.

---

### PBI-07 — Fluxo cliente (4 passos sem submit)

**Labels:** `frontend` `p0`
**Estimativa:** 5h · **Depende:** PBI-06
**Diagrama:** [fluxo-cliente.svg](diagramas/fluxo-cliente.svg) · **Telas:** `src/app/(public)/[orgSlug]/...` (existe)

#### 🔧 Backend
- [ ] `src/lib/server/orgs.ts#getOrgBySlug(slug)` — query + `unstable_cache` (slug é estável).
- [ ] Reusar `getAvailableSlots` do PBI-06 no loader de `/agendar/horario`.

#### 🎨 Frontend
- [ ] `/[orgSlug]` — landing W-01: hero + serviços + profs do banco (sem submit).
- [ ] `/[orgSlug]/agendar` — W-02: `ServicePicker`. Selecionar → push `?serviceId=...&continue=1` → próxima rota.
- [ ] `/[orgSlug]/agendar/profissional?serviceId=…` — W-03: lista profs que fazem o serviço + "qualquer".
- [ ] `/[orgSlug]/agendar/horario?serviceId=…&professionalId=…` — W-04: shadcn `Calendar` (passados disabled, +60d disabled), `SlotPicker` consome `getAvailableSlots` por data clicada.
- [ ] `StepIndicator` "Passo N/4".
- [ ] State 100% via URL search params — sem `useState` global, sem cookie, sem localStorage.
- [ ] Mobile-first; `max-w-md mx-auto`.
- [ ] Skeleton enquanto slots carregam.

#### 📜 Regra de negócio
- RN-06: janela 60d.
- RN-12: "qualquer profissional" → primeiro disponível em ordem alfabética (determinístico).
- RN-14: rotas públicas — sem login obrigatório para listar.

#### 🧪 Testes
- [ ] Componente: `SlotPicker` renderiza grid de horários a partir de mock.
- [ ] Componente: `StepIndicator` reflete passo correto.
- [ ] (E2E completo do fluxo entra em PBI-08 quando o submit fecha.)

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot mobile de cada um dos 4 passos. Smoke prod = abrir `/barbearia-demo/agendar` no mobile, navegar até o passo de horário (sem submeter ainda). Aviso ao cliente = "agendamento público está visível, sem submit ainda".

---

### PBI-08 — Confirmação + criação do agendamento

**Labels:** `frontend` `backend` `seguranca` `p0`
**Estimativa:** 5h · **Depende:** PBI-07, PBI-03

#### 🔧 Backend
- [ ] `src/lib/validators/booking.ts#bookingSchema` — `serviceId`, `professionalId`, `startsAt` (ISO), `customerName` 2–80, `customerPhone?`, `email`.
- [ ] `src/lib/server/booking-service.ts#createBooking({ orgId, input, sessionUserId?, force? })`:
  1. `bookingSchema.parse`.
  2. `withTenant(orgId, async db => { ... })`.
  3. Recalcula `calculateAvailableSlots` — se `startsAt` não está na lista, throw `SLOT_UNAVAILABLE`.
  4. Se anônimo: cria User com `emailVerifiedAt = null` (idempotente via `upsert` por email).
  5. `INSERT Appointment` — captura `23P01` (EXCLUDE) e `P2002` → throw `SLOT_UNAVAILABLE`.
  6. Best-effort: `sendBookingConfirmation` (Resend) — não bloqueia retorno.
  7. `revalidatePath('/admin/agenda')`.
- [ ] `src/app/(public)/[orgSlug]/agendar/confirmar/actions.ts#confirmBookingAction(formData)` → chama service → `redirect('/[slug]/agendamento/[id]')`.

#### 🎨 Frontend
- [ ] `/[orgSlug]/agendar/confirmar?…&startsAt=Z` — resumo (serviço, prof, data formatada SP) + form (nome/telefone/email).
- [ ] Pré-preencher de `session.user` se logado.
- [ ] Submit: `useFormStatus` para spinner; debounce no botão (idempotência client).
- [ ] Erro `SLOT_UNAVAILABLE` → toast vermelho + CTA "Voltar aos horários" (link com mesma query).
- [ ] `/[orgSlug]/agendamento/[id]` (W-06) — confirmação com QR/link de cancelamento.

#### 📜 Regra de negócio
- RN-04: anti-conflito — EXCLUDE no DB + recompute na SA (defesa em profundidade).
- RN-15: email cliente + email curto para owner.
- RN-16: `customerName`/`customerPhone` copy-on-write no Appointment.

#### 🧪 Testes
- [ ] Unit: `bookingSchema` — email malformado, nome 1 char, telefone livre.
- [ ] Integration: `createBooking` happy path insere + envia (mock Resend).
- [ ] Integration: 2 `createBooking` concorrentes (Promise.all) com mesmo slot → 1 sucesso, 1 `SLOT_UNAVAILABLE`.
- [ ] E2E feliz: navegar 4 passos → confirmar → ver página de sucesso.
- [ ] E2E race: abrir 2 abas no mesmo slot → 2ª recebe mensagem amigável.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot do confirmar + página de sucesso. Smoke prod = fazer 1 agendamento real end-to-end (cancela depois pelo cliente). **Comunicação cliente formal:** "barbearia agora aceita agendamentos públicos via link".

---

## D5 — Painel admin

### PBI-09 — Agenda do dia (admin)

**Labels:** `frontend` `backend` `p0`
**Estimativa:** 6h · **Depende:** PBI-08
**Tela:** `src/app/admin/agenda/` (já existe)

#### 🔧 Backend
- [ ] `src/lib/server/agenda.ts#getDayAgenda({ orgId, date, userRole, userProfId })` — devolve `{ professionals[], appointments[], blocks[] }` filtrado por role.
- [ ] SAs: `cancelAppointment(id, reason?)`, `markCompleted(id)`, `markNoShow(id)`, `quickCreateBooking(input, { force:true })`.
- [ ] Cancel < 2h ou após startsAt → exige `cancelReason` (Zod refine).

#### 🎨 Frontend
- [ ] `AgendaDayView` — CSS grid `grid-template-columns: repeat(N, 1fr)`; OWNER vê N cols, STAFF vê 1.
- [ ] Linha vermelha horizontal = hora atual (se data = hoje).
- [ ] Bloco Appointment colorido por status; bloco TimeBlock hachurado.
- [ ] `AppointmentDetailDialog` — ações Completed/NoShow/Cancel (com textarea de razão se needed).
- [ ] `QuickBookingDialog` — clicar slot livre abre wizard rápido (serviço → cliente → confirmar) que chama `quickCreateBooking({ force:true })`.
- [ ] Nav `◀ Hoje ▶` muda `?date=`.
- [ ] Toggle Dia/Semana — botão "Semana" disabled (badge "v2").

#### 📜 Regra de negócio
- RN-07: cancelamento — quem/quando/razão.
- RN-08/09: NoShow/Completed manual no MVP.
- RN-11: encaixe `force: true` pula RN-03/05/06 mas RN-04 (EXCLUDE) ainda barra.
- RN-14: STAFF só vê próprios.

#### 🧪 Testes
- [ ] Unit: SA `cancelAppointment` exige `reason` quando `now > startsAt - 2h`.
- [ ] Integration: STAFF não consegue cancelar appt de outro prof (RLS + role).
- [ ] Integration: `quickCreateBooking(force:true)` cria fora do horário, mas conflito ainda barra.
- [ ] E2E: cancelar appt da agenda → some da grid + status atualizado.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot agenda do dia (OWNER + STAFF). Smoke prod = OWNER abre agenda do dia, faz encaixe teste, cancela. Avisa cliente — agenda do dia está operacional.

---

### PBI-10 — Configurações da organização

**Labels:** `frontend` `backend` `p2`
**Estimativa:** 3h · **Depende:** PBI-02
**Tela:** `src/app/admin/configuracoes/` (já existe)

#### 🔧 Backend
- [ ] `src/lib/validators/organization.ts` — `name` 2–80, `slug` kebab 3–50 unique, `allowGuestBooking` bool.
- [ ] `updateOrganization` SA — OWNER only; mudar slug muda URL pública.

#### 🎨 Frontend
- [ ] Form básico; campo timezone disabled mostrando "America/Sao_Paulo (v2)".
- [ ] Mudança de slug → AlertDialog "isso vai mudar a URL pública, links antigos quebram".

#### 📜 Regra de negócio
- RN-13: timezone fixo no MVP.
- RN-CB-02: horário de verão — n/a (Brasil não tem).

#### 🧪 Testes
- [ ] Unit: slug `Hello World` falha (não kebab); `ab` falha (<3); `valid-slug` passa.
- [ ] Integration: slug duplicado retorna erro amigável.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshot tela configurações + modal de aviso de slug. Smoke prod = OWNER edita nome (não slug — evita quebrar URLs). Avisa cliente.

---

## D6 — Qualidade + CI

### PBI-11 — Testes de isolamento cross-tenant

**Labels:** `testes` `seguranca` `p0`
**Estimativa:** 4h · **Depende:** PBI-09

#### 🔧 Backend
- *(nenhum código novo — só testes)*

#### 🎨 Frontend
- *(nada)*

#### 📜 Regra de negócio
- Defesa em profundidade — ver [arquitetura-multi-tenant.svg](diagramas/arquitetura-multi-tenant.svg).
- 404 deliberado (não 403) para não vazar existência.

#### 🧪 Testes
- [ ] `tests/e2e/fixtures/two-orgs.ts` — fixture cria 2 orgs (`alfa`/`beta`) com 1 owner + 1 appointment cada.
- [ ] `tests/integration/tenant-isolation.test.ts`:
  - Query do tenant A não devolve dados do B.
  - INSERT em A com `organizationId` do B → erro.
  - UPDATE recurso de B (ID conhecido) → 0 rows affected.
  - Sem `SET app.current_org_id` → todas queries retornam `[]`.
- [ ] `tests/e2e/security/cross-tenant-leak.spec.ts`:
  - Login owner alfa → GET `/admin/agenda?appointmentId=<id-beta>` → 404.
  - SA `cancelAppointment(<id-beta>)` chamada com auth alfa → erro neutro.
- [ ] Rodam em **toda PR** (label exigida no CI do PBI-13).

#### 🚀 Deploy
Padrão (ver topo). **Variações:** sem screenshot, sem aviso ao cliente. Smoke prod = nenhum efeito visível; PR depois desta DEVE incluir os novos testes rodando verde no CI.

---

### PBI-12 — Suite mínima + coverage gates

**Labels:** `testes` `p1`
**Estimativa:** 4h · **Depende:** PBI-08

#### 🔧 Backend
- [ ] `vitest.config.ts` — coverage v8, reporter html+json+lcov.

#### 🎨 Frontend
- *(nada)*

#### 📜 Regra de negócio
- Cobertura mínima: global 70% lines/statements; `src/lib/server/**` 85%; `src/lib/validators/**` 95%. Quebra → CI vermelho.

#### 🧪 Testes
- [ ] Unit completo de `formatBRL`, `cn`.
- [ ] Unit validators (≥8): auth, service, professional, workingHours, timeBlock, booking, organization, slot input.
- [ ] Unit slot-calculator: já tem 15+ (PBI-06).
- [ ] Integration booking-service ≥5 casos.
- [ ] `pnpm test:coverage` gera `coverage/index.html`.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** sem screenshot, sem aviso. Smoke prod = nenhum (mudança de infra de teste). Validar que próximo PR sem cobertura suficiente é bloqueado pelo CI.

---

### PBI-13 — CI GitHub Actions

**Labels:** `infra` `testes` `p1`
**Estimativa:** 3h · **Depende:** PBI-12

#### 🔧 Backend
- [ ] `.github/workflows/ci.yml` jobs: `lint-typecheck`, `test-unit`, `test-integration` (Postgres service container + migrate), `test-e2e` (Playwright + Postgres).
- [ ] Cache `pnpm store` + `node_modules`.
- [ ] Comentário coverage diff (action `davelosert/vitest-coverage-report-action` ou similar).
- [ ] Branch protection main: require CI passing.

#### 🎨 Frontend
- *(nada)*

#### 📜 Regra de negócio
- PRs sem CI verde **não merge** em main.

#### 🧪 Testes
- [ ] Primeira execução verde end-to-end em PR de teste.
- [ ] `docker-compose.test.yml` valida fora do CI também.

#### 🚀 Deploy
Padrão (ver topo) **+ habilita branch protection** em `main` após o primeiro CI verde. A partir daqui TODA PR precisa de CI verde pra merger. Avisa o time (mudança de processo).

---

## D7 — Polish + deploy

### PBI-14 — Deploy Vercel + Neon

**Labels:** `infra` `p1`
**Estimativa:** 3h · **Depende:** PBI-13

#### 🔧 Backend
- [ ] Projeto Vercel apontando `main`.
- [ ] Neon: branch `main` → prod, branch `dev` → preview.
- [ ] Env vars no Vercel (prod + preview): `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`.
- [ ] `pnpm db:migrate deploy` no build step (ou job dedicado).
- [ ] `src/app/api/health/route.ts` → 200 + `{ db: 'ok' }`.

#### 🎨 Frontend
- *(nada novo; smoke manual abaixo)*

#### 📜 Regra de negócio
- Domínio `.vercel.app` no MVP; customizado em v2.

#### 🧪 Testes
- [ ] Smoke prod manual: cadastrar org teste via seed admin → fazer agendamento via fluxo público → ver na agenda admin.
- [ ] `/api/health` 200 em prod.

#### 🚀 Deploy
**Esta PBI É o deploy.** Variações sobre o padrão:
- "preview por PR" passa a existir DE FATO a partir desta PBI (antes era teórico).
- Smoke prod = roteiro completo: signup admin → criar org → criar serviço/prof → fazer agendamento → ver na agenda.
- Anuncio oficial ao cliente — URL pública agora real.

---

### PBI-15 — PWA + polimento UX

**Labels:** `frontend` `p2`
**Estimativa:** 3h · **Depende:** PBI-08

#### 🔧 Backend
- *(nada)*

#### 🎨 Frontend
- [ ] `public/manifest.json` + ícones 192/512.
- [ ] `metadata` raiz com `openGraph` + `twitter`.
- [ ] Service worker (next-pwa ou manual) — offline = "sem internet".
- [ ] Skeleton loaders em todas as listagens (substitui spinner).
- [ ] Empty states com CTA.
- [ ] Mensagens de erro PT-BR sem stack trace.

#### 📜 Regra de negócio
- Lighthouse mobile: Performance ≥80, Accessibility ≥90, Best Practices ≥90.

#### 🧪 Testes
- [ ] Lighthouse CI (action) bloqueia se score abaixo do threshold.
- [ ] E2E offline: ServiceWorker responde com fallback.

#### 🚀 Deploy
Padrão (ver topo). **Variações:** screenshots Lighthouse antes/depois. Smoke prod = rodar Lighthouse contra prod, anexar relatório. Avisa cliente: "app instalável (PWA), funciona offline limitado".

---

## Resumo de paralelização (D3 → D4)

```
PBI-04 ─┐
PBI-05 ─┼─→ (sequencial: 05 deps 04)        ┐
PBI-06 ─┼─→ pode rodar paralelo a 04/05     ├─→ PBI-07 → PBI-08 → PBI-09
PBI-10 ─┘ paralelo (só deps PBI-02)         ┘
```

Em um time misto de ~3 humanos + 2 agentes, dá pra ter `PBI-04` + `PBI-05` + `PBI-06` simultâneos no D3/D4 — o gargalo é o D4 (fluxo cliente fecha em série: 07→08).

## Como usar com o JSON do Trello

O arquivo [trello-import.json](trello-import.json) traduz este markdown em estrutura board/lists/cards.
- Cada PBI → 1 card com descrição em markdown (5 seções: Back/Front/Regra/Testes/Deploy).
- Checklists nativos do Trello (**5 por card**: 🔧 Backend, 🎨 Frontend, 📜 Regra de negócio, 🧪 Testes, 🚀 Deploy).
- O checklist 🚀 Deploy é igual em todos os cards (definido em `defaultChecklists.deploy` no JSON) — o script de import duplica em cada card.
- Labels mapeadas (`backend`, `frontend`, `infra`, `seguranca`, `testes`, `docs`, `p0/p1/p2`).
- Lista inicial = `Task` (atende como Backlog). Mover para `Doing`/`Review`/`Concluído` no fluxo.

**Scripts:**
- [`scripts/trello-import.ps1`](../scripts/trello-import.ps1) — primeira importação (cria os 15 cards do zero).
- [`scripts/trello-update.ps1`](../scripts/trello-update.ps1) — atualiza cards existentes (adiciona checklist 🚀 Deploy + bloco 📚 Recursos no desc se ainda não tem). Idempotente.
