# 08 — Protótipo (fluxos + wireframes)

> Protótipo de baixa fidelidade. Foco em **estrutura, hierarquia e fluxo**, não em visual. Visual fica para o componente shadcn + Tailwind aplicado na implementação.

## Princípios de UX

1. **Mobile-first.** Cliente final usa celular. Wireframes mostram a versão mobile primeiro.
2. **Fluxo cliente em ≤ 4 toques.** Serviço → profissional → horário → confirmar.
3. **Sem login obrigatório para agendar.** Email + telefone bastam (cria conta light).
4. **Admin desktop-first.** Painel admin pode assumir tela maior.
5. **Erros perto do erro.** Nunca toast genérico para erro de campo de form.

## Fluxograma principal: cliente agenda

```
                                ┌──────────────────┐
                                │  /[orgSlug]      │
                                │  (landing org)   │
                                └────────┬─────────┘
                                         │ "Agendar agora"
                                         ▼
                                ┌──────────────────┐
                                │ Escolher serviço │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Escolher prof.  │ ── pode pular se "qualquer"
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Escolher data + │
                                │     horário      │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Confirmar dados │ ← form: nome, telefone
                                │  (cria conta if  │   se não logado, cria User
                                │  não logado)     │
                                └────────┬─────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │ erro         │ sucesso      │ slot ocupou
                          ▼              ▼              ▼
                  Mensagem inline   Confirmação    Volta p/ horários
                  no campo          + email
```

## Fluxograma admin

```
  /login ──► /admin/dashboard
                │
        ┌───────┼──────────┬────────────┬───────────────┐
        ▼       ▼          ▼            ▼               ▼
     Agenda  Serviços  Profissionais  Configurações  Sair
        │
        ├──► Criar agendamento manual (encaixe)
        ├──► Cancelar / mover
        └──► Marcar concluído / no-show
```

## Wireframes — fluxo cliente (mobile)

### W-01 — Landing da barbearia `/[orgSlug]`

```
┌─────────────────────────────┐
│ ☰  Barbearia Demo        🔍 │  header
├─────────────────────────────┤
│                             │
│   [Logo / foto hero]        │
│                             │
│   Barbearia Demo            │
│   Av. Paulista, 1000        │
│   ★ 4.8 (123 avaliações)    │  (v2: avaliações)
│                             │
│   ┌─────────────────────┐   │
│   │  AGENDAR AGORA  →   │   │  CTA primário
│   └─────────────────────┘   │
│                             │
│   Serviços                  │
│   ┌─────────────────────┐   │
│   │ Corte        R$ 50  │   │
│   │ 30 min              │   │
│   ├─────────────────────┤   │
│   │ Barba        R$ 30  │   │
│   │ 20 min              │   │
│   ├─────────────────────┤   │
│   │ Combo        R$ 70  │   │
│   │ 50 min              │   │
│   └─────────────────────┘   │
│                             │
│   Profissionais             │
│   ┌────┐  ┌────┐            │
│   │ 👤 │  │ 👤 │            │
│   │João│  │Maria│           │
│   └────┘  └────┘            │
│                             │
└─────────────────────────────┘
```

### W-02 — Escolher serviço `/[orgSlug]/agendar`

```
┌─────────────────────────────┐
│ ← Voltar          Passo 1/4 │
├─────────────────────────────┤
│                             │
│  Escolha o serviço          │
│                             │
│  ┌─────────────────────┐    │
│  │ ○  Corte            │    │
│  │    30 min · R$ 50   │    │
│  ├─────────────────────┤    │
│  │ ●  Barba    [sel.]  │    │  selecionado
│  │    20 min · R$ 30   │    │
│  ├─────────────────────┤    │
│  │ ○  Combo            │    │
│  │    50 min · R$ 70   │    │
│  ├─────────────────────┤    │
│  │ ○  Coloração        │    │
│  │    90 min · R$ 150  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │   CONTINUAR    →    │    │  habilita só com seleção
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### W-03 — Escolher profissional `/[orgSlug]/agendar/profissional`

```
┌─────────────────────────────┐
│ ← Voltar          Passo 2/4 │
├─────────────────────────────┤
│                             │
│  Com quem você quer?        │
│                             │
│  ┌─────────────────────┐    │
│  │ ✨ Qualquer um      │    │  default sugerido
│  │    (mais rápido)    │    │
│  └─────────────────────┘    │
│                             │
│  ─── ou escolha ───         │
│                             │
│  ┌──────┐  ┌──────┐         │
│  │  👤  │  │  👤  │         │
│  │ João │  │Maria │         │
│  └──────┘  └──────┘         │
│                             │
│  ┌─────────────────────┐    │
│  │   CONTINUAR    →    │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### W-04 — Escolher data + horário `/[orgSlug]/agendar/horario`

```
┌─────────────────────────────┐
│ ← Voltar          Passo 3/4 │
├─────────────────────────────┤
│                             │
│  Quando?                    │
│                             │
│  ◀  Maio 2026           ▶   │
│                             │
│  D  S  T  Q  Q  S  S         │
│           1  2  3  4  5     │
│  6  7  8  9 10 11 12        │
│ 13 14 15[16]17 18 19        │  16 selecionado
│ 20 21 22 23 24 25 26        │
│ 27 28 29 30 31              │
│                             │
│  Horários disponíveis       │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │09:00│ │09:30│ │10:00│    │
│  └────┘ └────┘ └────┘       │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │10:30│ │ -- │ │11:30│    │  -- = ocupado
│  └────┘ └────┘ └────┘       │
│  ┌────┐ ┌────┐              │
│  │14:00│ │14:30│             │
│  └────┘ └────┘              │
│                             │
│  ┌─────────────────────┐    │
│  │   CONTINUAR    →    │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### W-05 — Confirmar `/[orgSlug]/agendar/confirmar`

```
┌─────────────────────────────┐
│ ← Voltar          Passo 4/4 │
├─────────────────────────────┤
│                             │
│  Confirme seus dados        │
│                             │
│  ┌─────────────────────┐    │
│  │ Serviço  Corte      │    │
│  │ Prof.    João       │    │
│  │ Data     16/05/2026 │    │
│  │ Horário  09:30      │    │
│  │ Total    R$ 50,00   │    │
│  └─────────────────────┘    │
│                             │
│  Nome *                     │
│  ┌─────────────────────┐    │
│  │ Bruno Silva         │    │
│  └─────────────────────┘    │
│                             │
│  Telefone (WhatsApp)        │
│  ┌─────────────────────┐    │
│  │ (11) 9 9999-8888    │    │
│  └─────────────────────┘    │
│                             │
│  Email *                    │
│  ┌─────────────────────┐    │
│  │ bruno@email.com     │    │
│  └─────────────────────┘    │
│                             │
│  ☑ Concordo com os termos   │
│                             │
│  ┌─────────────────────┐    │
│  │  CONFIRMAR     ✓    │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### W-06 — Confirmação `/[orgSlug]/agendamento/[id]`

```
┌─────────────────────────────┐
│                             │
│         ✓                   │
│   (ícone verde grande)      │
│                             │
│   Agendamento confirmado!   │
│                             │
│   Você vai receber um email │
│   de confirmação em alguns  │
│   minutos.                  │
│                             │
│  ┌─────────────────────┐    │
│  │ Corte com João      │    │
│  │ 16/05/2026, 09:30   │    │
│  │ Av. Paulista, 1000  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ ADICIONAR À AGENDA  │    │
│  └─────────────────────┘    │ (link .ics em v2)
│  ┌─────────────────────┐    │
│  │ CANCELAR            │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

## Wireframes — admin (desktop, mas responsivo)

### W-07 — Dashboard `/admin/dashboard`

```
┌──────────────────────────────────────────────────────────┐
│ Barbearia Demo                          Olá, Carla  ▼    │
├──────────────────────────────────────────────────────────┤
│ 📅 Agenda  ✂ Serviços  👥 Profissionais  ⚙ Config   ⎋   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Hoje, 16 de maio                                       │
│                                                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │   12 ag.     │  │  R$ 720      │  │  85% ocup.   │   │
│   │   hoje       │  │  estimado    │  │   hoje       │   │
│   └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│   Próximos agendamentos                                  │
│   ┌──────────────────────────────────────────────────┐   │
│   │ 09:00  Bruno Silva    Corte       João         │   │
│   │ 09:30  Ana Costa      Barba       Maria        │   │
│   │ 10:00  Pedro Lima     Combo       João         │   │
│   │ ...                                              │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
│   [Ver agenda completa →]                                │
└──────────────────────────────────────────────────────────┘
```

### W-08 — Agenda do dia `/admin/agenda`

```
┌──────────────────────────────────────────────────────────┐
│ ◀ 16/05/2026 ▶    [Hoje]    [Dia] [Semana]      [+ Novo] │
├──────────────────────────────────────────────────────────┤
│         │   João              │   Maria                  │
├─────────┼─────────────────────┼──────────────────────────┤
│  09:00  │ ▓▓▓ Bruno           │                          │
│  09:30  │ ▓▓▓ Corte           │ ▓▓▓ Ana                  │
│  10:00  │                     │ ▓▓▓ Barba                │
│  10:30  │ ▓▓▓ Pedro           │                          │
│  11:00  │ ▓▓▓ Combo           │ ░░░ [almoço]             │
│  11:30  │ ▓▓▓ (50min)         │ ░░░                      │
│  12:00  │ ░░░ [almoço]        │                          │
│  ...    │                     │                          │
├─────────┴─────────────────────┴──────────────────────────┤
│                                                          │
│ Legenda: ▓ Confirmado  ░ Bloqueio  □ Livre              │
└──────────────────────────────────────────────────────────┘
```

Clicar em bloco → modal com detalhes (cliente, serviço, ações).
Clicar em slot livre → modal "criar agendamento manual".

### W-09 — Lista de serviços `/admin/servicos`

```
┌──────────────────────────────────────────────────────────┐
│ Serviços                              [+ Novo serviço]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Nome      Duração   Preço     Ativo    Ações       │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Corte     30 min    R$ 50,00  ✓        [✎][✕]      │  │
│  │ Barba     20 min    R$ 30,00  ✓        [✎][✕]      │  │
│  │ Combo     50 min    R$ 70,00  ✓        [✎][✕]      │  │
│  │ Coloração 90 min    R$ 150,00 ✓        [✎][✕]      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### W-10 — Form de serviço (modal/drawer)

```
┌──────────────────────────────────────────────────────────┐
│  Novo serviço                                       [X]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Nome *                                                  │
│  ┌──────────────────────────────────────────────┐        │
│  │ Corte de cabelo                              │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Descrição                                               │
│  ┌──────────────────────────────────────────────┐        │
│  │                                              │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Duração *           Preço (R$) *                        │
│  ┌────────┐          ┌────────┐                          │
│  │ 30 min │          │ 50,00  │                          │
│  └────────┘          └────────┘                          │
│                                                          │
│  Profissionais que fazem este serviço                    │
│  ☑ João                                                  │
│  ☑ Maria                                                 │
│                                                          │
│  ☑ Ativo                                                 │
│                                                          │
│           [ Cancelar ]      [ Salvar ]                   │
└──────────────────────────────────────────────────────────┘
```

### W-11 — Profissional + horários `/admin/profissionais/[id]`

```
┌──────────────────────────────────────────────────────────┐
│ João                                          [Editar]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Horários de trabalho                                    │
│                                                          │
│  Segunda    09:00 ── 12:00  /  14:00 ── 19:00            │
│  Terça      09:00 ── 12:00  /  14:00 ── 19:00            │
│  Quarta     09:00 ── 12:00  /  14:00 ── 19:00            │
│  Quinta     09:00 ── 12:00  /  14:00 ── 19:00            │
│  Sexta      09:00 ── 12:00  /  14:00 ── 19:00            │
│  Sábado     09:00 ── 17:00                               │
│  Domingo    [fechado]                                    │
│                                                          │
│  [+ Adicionar faixa]                                     │
│                                                          │
│  Serviços que executa                                    │
│  ☑ Corte   ☑ Barba   ☑ Combo   ☐ Coloração               │
│                                                          │
│  Bloqueios futuros (férias, etc.)                        │
│  • 23/05 09:00 → 25/05 18:00 — Férias        [Remover]  │
│  [+ Novo bloqueio]                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Componentes de UI a construir (mapeamento → shadcn)

| Componente do protótipo | Origem |
|---|---|
| Botão CTA / secundário | `Button` (shadcn) |
| Cards de serviço | `Card` + custom |
| Picker de horário | custom (`Button` + grid) |
| Calendário | shadcn `Calendar` |
| Modal de form | shadcn `Dialog` |
| Tabela de serviços | shadcn `Table` |
| Toast de feedback | shadcn `Sonner` |
| Form fields | shadcn `Form` + `Input` + `Label` + `react-hook-form` + `zodResolver` |
| Skeleton loading | shadcn `Skeleton` |
| Empty states | custom (`EmptyState.tsx`) |

## Estados visuais obrigatórios

Toda lista/pagina deve cobrir:

- **Loading** (skeleton, não spinner)
- **Empty** (com CTA para criar primeiro item)
- **Erro** (mensagem clara + retry)
- **Sucesso** (estado normal)

## Próximos passos do protótipo

- Implementar telas em ordem: W-01 → W-02 → W-03 → W-04 → W-05 → W-06 → W-08 → W-09 → W-11.
- Mock data em memória nas primeiras passadas (sem Prisma) para acelerar UX.
- Depois trocar mocks por queries reais via `lib/server/*`.
- Figma fica para a versão "polida" — não bloqueante para MVP.
