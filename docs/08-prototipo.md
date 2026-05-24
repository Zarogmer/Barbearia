# 08 — Protótipo (fluxos + wireframes)

> **Protótipo navegável interativo:** [docs/prototipo/index.html](prototipo/index.html) — abra direto no navegador ou rode `npx serve docs/prototipo` para um servidor local. Inclui **16 telas MVP + 5 v2** em mockups de alta fidelidade + 3 paletas trocáveis em tempo real + componentes + tokens + estados de borda (empty/loading/erro).
>
> **Cobertura do protótipo (v0.4.0):**
>
> **MVP (W-01..W-16):**
> - W-01..W-06 — fluxo cliente (mobile)
> - W-07..W-09 — admin (dashboard, agenda, lista de serviços)
> - W-10 — modal Novo Serviço (CRUD)
> - W-11 — modal Novo Profissional (CRUD)
> - W-12 — login + cadastro (split-screen)
> - W-13 — drawer detalhes de agendamento (sobre W-08)
> - W-14 — lista de profissionais (admin)
> - W-15 — modal Novo Agendamento (encaixe manual)
> - W-16 — modal Cancelar agendamento (com motivo)
> - + página de Configurações da org
> - + 6 estados de borda (empty/loading/erro/404/validation)
>
> **v2 / pós-MVP (W-17..W-21):** ⏳ não implementar agora
> - W-17 — Relatórios financeiros (KPIs, gráficos, comissões por profissional)
> - W-18 — Estoque de produtos (lista + alertas de mínimo + entrada/saída)
> - W-19 — Meus agendamentos (cliente logado, mobile)
> - W-20 — CRM · Lista de clientes (com tag VIP/Regular/Perdido)
> - W-21 — Caixa diário (PDV: abertura/sangria/fechamento + movimentos)
>
> Os wireframes ASCII abaixo continuam sendo a fonte canônica de **estrutura, hierarquia e fluxo**. O protótipo HTML mostra como esses wireframes ficam com o design system aplicado.

## Design System — "Lustro"

Nome interno do design system: **Lustro** (do verbo polir, dar brilho — alusão à profissão de barbeiro).

### Tipografia (Google Fonts, gratuitas)

| Papel | Família | Pesos | Onde usar |
|---|---|---|---|
| **Display** | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | 400–800 | Headlines, hero, títulos de seção (h1..h3), KPIs grandes |
| **Body** | [Inter](https://fonts.google.com/specimen/Inter) | 400–700 | Texto corrido, labels de form, navegação, cards |
| **Mono** | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | 400–600 | Horários (09:30), preços (R$ 50,00), IDs, eyebrows, datas |
| **Editorial accent** | [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | 400 italic | Destaques pontuais em hero ("agendar virou *arte*") — opcional |

Carregar via `next/font/google` no `src/app/layout.tsx`. Subset latin + display swap obrigatório.

### Paletas (3 opções, trocáveis via CSS custom properties)

Cada paleta define 11 tokens. Trocar é renomear `data-theme` no `<html>`. Sem refactor de classes.

#### A — Charcoal Premium *(recomendada / default)*
Neutros profundos + accent dourado discreto. Atemporal de barbearia masculina premium.

| Token | Light | Dark |
|---|---|---|
| `--brand` | `38 92% 50%` (amber-500 #f59e0b) | `41 96% 56%` |
| `--ink` | `240 10% 4%` (zinc-950) | `0 0% 98%` |
| `--surface` | `0 0% 100%` (white) | `240 10% 4%` |
| `--surface-2` | `240 5% 98%` | `240 6% 9%` |
| `--line` | `240 6% 90%` | `240 5% 18%` |

#### B — Sunset Modern
Gradient quente rosa→laranja, neutros mornos. Jovem, friendly, beauty-forward.

| Token | Light | Dark |
|---|---|---|
| `--brand` | `339 90% 51%` (rose-500) | `339 90% 60%` |
| `--ink` | `330 30% 8%` | `30 20% 96%` |
| `--surface` | `30 33% 99%` (warm white) | `330 10% 6%` |

#### C — Editorial Black
Hyper-minimal, alto contraste, accent esmeralda. Vibe Linear / Vercel.

| Token | Light | Dark |
|---|---|---|
| `--brand` | `160 84% 35%` (emerald-700) | `160 75% 45%` |
| `--ink` | `0 0% 4%` (near-black) | `0 0% 98%` |
| `--surface` | `0 0% 100%` (pure white) | `0 0% 0%` (pure black) |

### Tokens base

- **Radii:** `4 · 8 · 12 · 16 · 24 · 32 · 999` (4px grid). Padrão `12`.
- **Spacing:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` (4px grid).
- **Shadows:** `xs` (1px hairline) → `sm` (card resting) → `md` (card hover) → `lg` (modal) → `xl` (dropdown/popover) — todas HSL-based em `--ink` com opacity baixa, sem cinza saturado.
- **Border:** sempre `hsl(var(--line))`, 1px.
- **Brand glow (foco):** `0 0 0 4px hsl(var(--brand) / 0.18)` — usado em `:focus-visible` de inputs/buttons.

### Animação

Three libs, três usos:

| Lib | Uso | Quando |
|---|---|---|
| **`motion/react`** (sucessora Framer Motion, ~30kb) | Layout animations, stagger, gestures | Cards entrando, sheet/drawer abrindo, transições de estado |
| **`tailwindcss-animate`** (já no projeto) | Fade/slide/zoom utilitários sem JS | Modais shadcn, toasts, hover states |
| **View Transitions API** (nativa, Next.js 15 `unstable_ViewTransition`) | Transições entre rotas | W-02 → W-03 → W-04 → W-05 (fluxo cliente em 4 toques) |

**Princípio:** animação só onde dá feedback. Microanimações curtas (150–250ms). Cubic-bezier `(0.16, 1, 0.3, 1)` (ease-out-quint) é o default. Animação grande (>400ms) reservada pra momentos especiais: o checkmark da confirmação (W-06).

Respeitar sempre `@media (prefers-reduced-motion: reduce)` — desligar tudo exceto opacity.

### Componentes principais (shadcn + custom)

| Componente | Origem | Custom |
|---|---|---|
| Button | shadcn | Adicionar variante `brand` (cor primária = amber/rose/emerald), size `lg` (h-12) |
| Input | shadcn | Focus ring com `--brand`, label flutuante opcional |
| Card | shadcn | Variante `is-interactive` com hover lift + border glow |
| Calendar | shadcn | Sem mudanças |
| Dialog/Sheet | shadcn | Backdrop com `backdrop-blur` |
| `ChipSlot` | custom | Botão para horário, 3 estados (livre/selecionado/ocupado), mono font |
| `Stepper` | custom (já existe `StepIndicator`) | Dots conectados, dot ativo expande pra pill |
| `AvatarRing` | custom | Avatar com `conic-gradient` ring (brand → ink) |
| `KpiCard` | custom (admin) | Número grande mono + delta + sparkline |
| `Timeline` | custom (admin) | Grid de 2 colunas (1 por profissional), blocos absolutamente posicionados |

### Tema escuro

Todas as paletas suportam dark mode via `data-mode="dark"` no `<html>`. Detectar `prefers-color-scheme` + permitir toggle manual com persistência em localStorage. Implementar no MVP? **Não.** Fica pra v2. Tokens já estão prontos pro dia em que ligarmos.

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
