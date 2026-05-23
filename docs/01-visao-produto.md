# 01 — Visão de produto

## Problema

Barbearias e salões de beleza no Brasil ainda gerenciam agenda por WhatsApp, caderno físico ou planilha. Resultado:

- **Cliente** não consegue ver disponibilidade em tempo real, não tem confirmação automática, esquece o horário.
- **Profissional/dono** perde tempo respondendo "tem horário tal dia?", lida com no-show frequente, não tem visibilidade da ocupação.
- **Negócio** não tem dados (horários mais procurados, serviços mais vendidos, taxa de retorno).

Ferramentas existentes são caras, com onboarding pesado, ou são apps genéricos de "marcar reunião" que não entendem o domínio (duração variável por serviço, profissional preferido, encaixe, espera).

## Persona

### P1 — Cliente final (Bruno, 28 anos)

- Quer cortar cabelo no sábado de manhã sem precisar mandar mensagem.
- Tem profissional preferido; topa outro se for mais rápido.
- Usa o celular para tudo.
- Confia em sistemas que mostram disponibilidade real e mandam lembrete.

### P2 — Dono(a) da barbearia (Carla, 35 anos)

- Tem 1 salão com 4 profissionais.
- Já usou agenda Google + WhatsApp; cansa.
- Quer ver agenda do dia rapidamente, bloquear horário pessoal, controlar quem pode marcar com quem.
- Não tem tempo nem paciência para sistema complicado. Quer login, ver agenda, pronto.

### P3 — Profissional (Marcos, 32 anos, funcionário da Carla)

- Quer ver só a SUA agenda do dia.
- Quer marcar encaixe sem precisar pedir pra dona.
- Quer ver o nome do próximo cliente.

## Proposta de valor

> Agendamento online simples, mobile-first, com **isolamento total entre barbearias** e dados que ajudam o dono a tomar decisão.

**Diferenciais do MVP:**

1. Cliente agenda em 3 cliques (serviço → horário → confirmar).
2. Dono onboarda em < 10 minutos (cadastra serviços, profissionais, horário e está rodando).
3. Multi-tenant real: cada barbearia vê só os próprios dados, com RLS no banco.
4. Sem app store, sem download — PWA na web.

## Escopo MVP (1 semana, 2026-05-23 → 2026-05-30)

### IN

- [ ] Multi-tenancy single-DB com `organizationId` + RLS no Postgres.
- [ ] Auth: cliente (email+senha ou Google) e admin (email+senha).
- [ ] Cadastro de **serviços** (nome, duração, preço).
- [ ] Cadastro de **profissionais** (nome, foto, serviços que faz, horários de trabalho).
- [ ] **Fluxo de agendamento do cliente**: escolhe serviço → escolhe profissional (ou "qualquer") → escolhe data/horário disponível → confirma.
- [ ] **Painel admin**: visualizar agenda do dia/semana, criar/bloquear/cancelar agendamento manualmente.
- [ ] Validação de **conflito de horário** server-side (não dá pra marcar 2x o mesmo slot).
- [ ] Email de **confirmação** ao criar agendamento (Resend ou similar).
- [ ] PWA básico (manifest + ícone) para "instalar" no celular.

### OUT (vai para v2)

- ❌ Pagamento online / sinal / cartão.
- ❌ Comissão por profissional / fechamento de caixa.
- ❌ Estoque de produtos.
- ❌ Programa de fidelidade.
- ❌ Lembrete por WhatsApp (vai por email no MVP).
- ❌ Multi-idioma (PT-BR apenas).
- ❌ Onboarding self-service de novas barbearias (super-admin cria manualmente).
- ❌ Billing/subscription SaaS.
- ❌ Customização visual por tenant (logo, cores).
- ❌ Relatórios avançados (BI, exportação).
- ❌ Integração com Google Calendar / iCal.

## KPIs (pós-MVP, primeiros 30 dias)

| Métrica | Meta |
|---|---|
| Barbearias ativas (≥1 agendamento na semana) | 5 |
| Agendamentos criados | 100 |
| Taxa de conversão (visitou fluxo → confirmou) | ≥ 40% |
| Taxa de no-show | < 15% |
| Tempo médio do fluxo cliente (entrada → confirmação) | < 90s |
| NPS dos donos de barbearia | ≥ 50 |

## Premissas e riscos

| Item | Tipo | Mitigação |
|---|---|---|
| Postgres com RLS bem configurado é suficiente para isolamento de tenants | Premissa | Testes E2E cross-tenant; revisão de SecOps antes de prod |
| Donos de barbearia toparão usar email/senha (sem WhatsApp) | Risco | Fluxo de "esqueci senha" testado; suporte humano nas 2 primeiras semanas |
| Resend gratuito basta para volume inicial | Premissa | Plano free do Resend: 100 emails/dia. Acima disso, plano pago ou SES |
| Deploy na Vercel + Neon cobre a demanda | Premissa | Free tier suficiente para 5-10 barbearias iniciais |

## O que NÃO é

- Não é um marketplace ("Booksy br"). Cada barbearia tem seu próprio link/subdomínio futuramente; descoberta cross-tenant é v2+.
- Não é um app de marcar consulta médica genérico. Domínio é beleza/barbearia — duração variável, profissional, encaixe.
- Não é uma agenda pessoal. Foco é estabelecimento com múltiplos profissionais.
