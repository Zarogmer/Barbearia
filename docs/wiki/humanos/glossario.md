# 📖 Glossário

> 1 linha por termo. Onde houver fonte canônica, link no final.

## 🏪 Domínio (negócio)

| Termo | Definição | Fonte |
|---|---|---|
| **Organização / Org** | Uma barbearia ou salão. Tenant raiz no sistema; toda entidade de negócio carrega `organizationId`. | [07 §Glossário](../../07-regras-negocio.md) |
| **Owner** | Dono da barbearia. Role `OWNER` no `Membership` — full access dentro da org. | [04 §Matriz](../../04-seguranca.md) |
| **Staff** | Funcionário/profissional logado. Role `STAFF` — vê só própria agenda + clientes. | [04 §Matriz](../../04-seguranca.md) |
| **Profissional** | Pessoa que atende clientes (barbeiro, cabeleireiro, manicure). Entidade `Professional`. | [03 §Schema](../../03-modelo-dados.md) |
| **Serviço** | Procedimento ofertado (Corte, Barba, Coloração). Duração fixa em minutos. | RN-02 |
| **Slot** | Janela de tempo candidata a agendamento. Granularidade default **15 min**. | RN-03 |
| **Agendamento (Appointment)** | Reserva confirmada de um slot por cliente. Status: `CONFIRMED` / `COMPLETED` / `CANCELLED` / `NO_SHOW`. | RN-20 |
| **WorkingHours** | Faixas de horário em que profissional atende, por dia da semana. Pode ter múltiplas faixas/dia. | RN-01 |
| **TimeBlock** | Intervalo em que profissional NÃO atende (almoço, férias, pessoal). | RN-10 |
| **Walk-in** | Cliente que aparece sem agendar — admin cria appointment direto, opcionalmente com `force: true`. | RN-11 |
| **Encaixe** | Mesmo que walk-in via admin — `force: true` pula RN-03/05/06 mas EXCLUDE constraint ainda barra conflito. | RN-11 |
| **No-show** | Cliente confirmado que não compareceu. Marcado manualmente pelo admin. | RN-08 |
| **Antecedência mínima** | Cliente final só agenda com ≥ 30 min de antecedência. Admin não tem esse limite. | RN-05 |
| **Janela futura** | Cliente final só agenda até 60 dias adiante. Admin sem limite. | RN-06 |
| **"Qualquer profissional"** | Opção no fluxo cliente — pega primeiro disponível em ordem alfabética. | RN-12 |
| **Copy-on-write** | Nome/telefone do cliente são copiados pro `Appointment` no momento da criação — histórico não some se cliente deletar conta. | RN-16 |

## 🔧 Técnico

| Termo | Definição |
|---|---|
| **Multi-tenant** | Vários clientes (barbearias) usam a mesma instância da aplicação, isolados por `organizationId` + RLS. |
| **Tenant** | Uma `Organization`. "Tenant context" = qual org está ativa na request. |
| **RLS (Row Level Security)** | Filtro no banco que rejeita queries que tentem ler/escrever dados de outra org. Aplicada via policies + `current_org_id()`. [03 §Políticas](../../03-modelo-dados.md) |
| **`withTenant(orgId, fn)`** | Helper de `src/lib/db.ts` que abre transação e seta `SET LOCAL app.current_org_id = '...'` antes de rodar `fn`. |
| **EXCLUDE constraint** | Constraint do Postgres (via `btree_gist`) que rejeita 2 appointments do mesmo profissional com tempos sobrepostos. Backstop contra race condition. |
| **Server Action** | Função `"use server"` chamada do client como se fosse handler — Next 15 serializa e roda no servidor. |
| **Server Component (RSC)** | Componente React renderizado no servidor; default no App Router. |
| **Client Component** | Componente com `"use client"` — necessário para `useState`, eventos, browser APIs. |
| **Zod** | Lib de validação. Toda fronteira (Server Action, API route) começa com `schema.parse(input)`. |
| **shadcn/ui** | Coleção de componentes copiados pro repo (não package). Estão em `src/components/ui/`, **não editar manualmente**. |
| **Membership** | Tabela que liga `User` ↔ `Organization` com `role`. Determina o que cada user pode fazer em qual org. |
| **PBI (Product Backlog Item)** | Unidade de trabalho. ID `PBI-NN`. Definição em [docs/09](../../09-pbis.md), versão tabular em [docs/11](../../11-pbis-detalhado.md). |
| **RN-XX** | Regra de Negócio. RN-01 a RN-20. Toda PR de domínio deve citar quais RN implementa/atualiza. [07-regras-negocio.md](../../07-regras-negocio.md) |
| **W-XX** | Wireframe do protótipo. W-01..W-12. [08-prototipo.md](../../08-prototipo.md) |
| **D1..D7** | Dia 1 a 7 da sprint MVP. Cronograma em [10-plano-semana.md](../../10-plano-semana.md). |
| **DoD (Definition of Done)** | Checklist universal pra fechar uma PBI: typecheck, lint, test, 1+ reviewer, docs atualizados. [09 §DoD](../../09-pbis.md) |
| **AC (Acceptance Criteria)** | Lista bullet-point de "o que precisa funcionar pra essa PBI estar pronta". |
| **ADR (Architecture Decision Record)** | Registro de decisão arquitetural não-trivial. Mora em [02-arquitetura.md](../../02-arquitetura.md). |
| **shortLink (Trello)** | ID curto de 8 chars do board (`hYZHvqGV`). Alguns endpoints da API Trello exigem o ID completo (24 hex). |

## 💱 Convenções de dados

| Convenção | Onde se aplica |
|---|---|
| **Centavos (integer)** | Preço sempre em `priceCents` (ex: R$50 = `5000`). Util `formatBRL(cents)` formata pra exibir. |
| **Minutos desde 00:00 local** | `WorkingHours.startMinute/endMinute` (0..1440). Granularidade interna do slot-calculator. |
| **UTC no banco** | Todas as datas em `timestamptz`. Conversão pra `America/Sao_Paulo` só na borda (render ou input). RN-13. |
| **UUID v7 / v4** | IDs gerados via `gen_random_uuid()` no Postgres. Ordenáveis por tempo melhor que v4 puro. |
| **Range `[)`** | EXCLUDE constraint usa range fechado-aberto: appt terminando 10:00 não conflita com começando 10:00. RN-CB-01. |
| **kebab-case** | Arquivos não-componente, slugs de URL, branches. |
| **PascalCase** | Componentes React, tipos, interfaces. |
| **camelCase** | Funções, variáveis. |
| **SCREAMING_SNAKE** | Constantes exportadas, env vars. |
