# 10 — Plano da semana (D1 → D7)

## Janela

**2026-05-23 (sábado) → 2026-05-30 (sábado).** 7 dias corridos.

## Resumo executivo

| Dia | Data | Foco | Entregas | Risco |
|---|---|---|---|---|
| D1 | sáb 2026-05-23 | Fundação | Docs completos + scaffold + protótipo navegável | baixo |
| D2 | dom 2026-05-24 | Banco + Auth | PBI-01, 02, 03 | médio (RLS é delicado) |
| D3 | seg 2026-05-25 | CRUD Admin | PBI-04, 05 | baixo |
| D4 | ter 2026-05-26 | Fluxo Cliente | PBI-06, 07, 08 | médio (slot calculator) |
| D5 | qua 2026-05-27 | Painel Admin | PBI-09, 10 | baixo |
| D6 | qui 2026-05-28 | Qualidade + CI | PBI-11, 12, 13 | médio (cross-tenant tests) |
| D7 | sex 2026-05-29 | Deploy + Polish | PBI-14, 15 | médio (primeiro deploy) |
| Buffer | sáb 2026-05-30 | Smoke + ajustes | — | — |

> **Sábado (D7+1) é buffer**, não dia de feature nova. Reservado para bugs encontrados em smoke test, polish final e demo.

## Time e capacidade

Composição assumida (ajustar conforme realidade):

| Papel | Quem | Capacidade efetiva |
|---|---|---|
| Tech lead / dev fullstack | você | 6-8h/dia |
| Dev fullstack (humano) | dev 1 | 6h/dia |
| Dev fullstack (humano) | dev 2 | 6h/dia |
| Agente Claude Code | 1-2 instâncias | ~independente (você revisa) |

**Capacidade humana semanal:** ~125h (3 devs × 6h × 7 dias).
**Estimativa de PBIs:** ~62h.
**Folga:** ~50% para overhead (reviews, reuniões, bugs, retrabalho).

Se time for menor, **cortar antes do prazo**:
- 2 devs humanos: viável, mas sem buffer.
- 1 dev + agentes: tenso. Considere mover PBI-10, PBI-15 para v2.

## Cronograma diário detalhado

### D1 — Sábado 2026-05-23 (hoje)

**Foco:** documentação completa + scaffold rodando + protótipo navegável.

- [ ] **Manhã / hoje:** Docs 00–10 (este e os outros).
- [ ] **Tarde:** Scaffold Next.js 15 + Tailwind + shadcn + Prisma. Rodar em `localhost:3000`.
- [ ] **Noite:** Protótipo navegável das telas principais com mock data (sem backend real ainda). Foco em UX/fluxo.

**Critério de fim de dia:**
- `docs/` completo (00 a 10).
- `pnpm dev` rodando.
- Pelo menos 6 telas do protótipo (W-01, W-02, W-03, W-04, W-05, W-08) navegáveis com mocks.

---

### D2 — Domingo 2026-05-24

**Foco:** banco + autenticação.

- [ ] **PBI-01** — Postgres + migrations + RLS (4h, 1 dev)
- [ ] **PBI-02** — NextAuth Credentials (4h, 1 dev)
- [ ] **PBI-03** — Google OAuth + email verificação (3h, 1 dev) — pode ser feito por agente

**Paralelizável:** PBI-01 e PBI-02 não dependem (NextAuth precisa de tabelas que PBI-01 cria, mas é trivial usar `db:push` em paralelo). PBI-03 depende de PBI-02.

**Critério de fim de dia:**
- Login funciona (admin@demo.com / senha123).
- Cadastro de cliente envia email (mock no console em dev).
- Migrations + RLS aplicados e testados com query manual.
- Build + lint + typecheck verdes.

**Risco:** RLS exige cuidado. Reserve 2h de buffer. Se travar > 4h, ping pra mim.

---

### D3 — Segunda 2026-05-25

**Foco:** CRUD admin (serviços + profissionais).

- [ ] **PBI-04** — CRUD serviços (5h, 1 dev)
- [ ] **PBI-05** — CRUD profissionais + horários (6h, 1 dev ou 1 dev + 1 agente paralelo)

**Paralelizável:** PBI-04 e PBI-05 são independentes — alocar 1 dev para cada.

**Critério de fim de dia:**
- Owner consegue criar serviços e profissionais via painel.
- Validações Zod completas.
- Pelo menos 1 teste E2E por PBI.

---

### D4 — Terça 2026-05-26

**Foco:** fluxo do cliente (coração do produto).

- [ ] **PBI-06** — Slot calculator (5h, 1 dev sênior)
- [ ] **PBI-07** — UI fluxo cliente (5h, 1 dev frontend)
- [ ] **PBI-08** — Confirmação + criar appointment (5h, 1 dev fullstack)

**Paralelizável:** PBI-06 e PBI-07 podem ser paralelos (mock dados nos pickers até PBI-06 pronto). PBI-08 espera os dois.

**Critério de fim de dia:**
- Cliente consegue agendar end-to-end no browser.
- Email de confirmação envia.
- Slot reservado não aparece mais como disponível.

**Risco:** slot-calculator pode dar trabalho. Reserve ½ dia se nunca implementou algo assim. Pair programming recomendado.

---

### D5 — Quarta 2026-05-27

**Foco:** painel admin completo.

- [ ] **PBI-09** — Agenda do dia (6h, 1 dev frontend)
- [ ] **PBI-10** — Configurações da org (3h, 1 dev ou agente)

**Paralelizável:** sim, independentes.

**Critério de fim de dia:**
- Admin vê agenda do dia com appointments coloridos por profissional.
- Admin marca appointment como `COMPLETED`/`NO_SHOW`/`CANCELLED`.
- Admin cria encaixe manual.

---

### D6 — Quinta 2026-05-28

**Foco:** qualidade. **Não negociar.**

- [ ] **PBI-11** — Testes de isolamento cross-tenant (4h, dev sênior)
- [ ] **PBI-12** — Coverage gates + testes mínimos (4h, 1 dev)
- [ ] **PBI-13** — CI GitHub Actions (3h, 1 dev ou agente)

**Paralelizável:** PBI-11 e PBI-12 sim. PBI-13 depende de PBI-12 (gates só fazem sentido com testes).

**Critério de fim de dia:**
- CI verde em PR de teste.
- Coverage ≥ thresholds.
- Cross-tenant leak coberto por teste E2E e integration.

**Atenção:** se aqui estiver vermelho, **não avance para D7**. Fix first.

---

### D7 — Sexta 2026-05-29

**Foco:** deploy + polish.

- [ ] **PBI-14** — Deploy Vercel + Neon (3h, dev com acesso)
- [ ] **PBI-15** — PWA + polish (3h, 1 dev frontend)

**Paralelizável:** sim.

**Critério de fim de dia:**
- App acessível em URL pública.
- Smoke test manual em prod: agendar, login admin, ver agenda.
- Health check verde.
- Lighthouse mobile ≥ 80/90/90.

---

### D7+1 — Sábado 2026-05-30 (buffer)

**Sem feature nova.** Reservado para:

- Bugs encontrados em smoke test.
- Ajustes de UX óbvios.
- Pequenos fixes de copy/visual.
- Demo gravado.

Se nada pegar fogo: descansar.

## Ritos da semana

| Rito | Quando | Duração | Objetivo |
|---|---|---|---|
| **Daily stand-up** | 09:00 todo dia | 15 min | "Ontem fiz X, hoje farei Y, travado em Z" |
| **Triage de bug** | quando aparece | curto | Decidir: fix agora vs PBI para v2 |
| **Demo interna** | D5 fim do dia | 30 min | Validar UX cliente + admin com o time |
| **Pre-deploy review** | D7 manhã | 1h | Checklist de [docs/04-seguranca.md](04-seguranca.md) |
| **Retrospectiva** | D7+1 ou D8 | 30 min | O que dar certo, o que mudar |

## Comunicação

- **Canal:** definir (Slack/Discord/Telegram).
- **Não-bloqueio:** mensagem assíncrona. Resposta em até 2h em horário comercial.
- **Bloqueio:** marcar mensagem com 🚨 + descrever o bloqueio + chamar tech lead.
- **Status diário no canal:** cada dev posta as 16:00 com "PBI X em progresso, blockers Y, ETA Z".

## O que pode dar errado (e plano)

| Problema | Sinal | Mitigação |
|---|---|---|
| RLS quebra alguma query | testes vermelhos no D2 | reverter para `BYPASSRLS` em dev por 1h enquanto investiga; **não em prod** |
| Slot calculator tem bug sutil | comportamento estranho ao agendar | testes unit cobrindo edges (PBI-06 exige 15+) reduzem chance |
| Deploy falha no D7 | build vermelho na Vercel | preview deploys em todo PR antes do D7 → pega cedo |
| Cross-tenant leak descoberto tarde | smoke test em D7 | PBI-11 no D6 obriga teste antes do deploy |
| Time menor que planejado | PBIs ficam pra trás | cortar PBI-10 e PBI-15 (não-essenciais) |
| Algum dev fica doente | -1 capacidade | redistribuir; agente Claude pode pegar PBIs de validação/CI |
| Escopo cresce mid-week | "ah só preciso adicionar X" | **rejeitar.** X vira PBI v2. Documente no backlog futuro de [09-pbis.md](09-pbis.md) |

## Checklist de "MVP pronto" (D7)

Pronto para apresentar:

- [ ] App deployado e acessível por URL pública
- [ ] Cliente consegue agendar em < 90s
- [ ] Admin consegue ver agenda do dia
- [ ] Admin consegue criar serviço + profissional
- [ ] Email de confirmação chega
- [ ] Login funciona (admin + cliente)
- [ ] Testes E2E críticos passam em CI
- [ ] Cross-tenant leak coberto por teste
- [ ] Política de privacidade publicada
- [ ] README permite alguém novo rodar em < 30 min

## Pós-MVP imediato (semana 2)

Não no escopo da semana, mas listar para visibility:

- Onboarding self-service de novas barbearias
- Lembrete por WhatsApp (Cloud API)
- Métricas básicas (Plausible ou similar)
- Sentry para erros em prod
- Backup automatizado + plano de DR

## Definição de sucesso da semana

1. **Funcional:** 1 barbearia real consegue se cadastrar (com nossa ajuda) e operar 1 dia inteiro com o sistema.
2. **Técnico:** zero vazamento entre tenants em produção. Zero senhas em log.
3. **Time:** todo mundo entende o código que pegou. Nada de "PR que ninguém revisou".
4. **Pessoal:** o time não está esgotado no final. Buffer respeitado.
