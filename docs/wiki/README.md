# 📚 Wiki — Barbearia SaaS

> Portal de navegação. **Não é fonte canônica** — os docs canônicos vivem em [`docs/01..11`](../). Esta wiki organiza trilhas, sintetiza e responde "por onde começo?".

## 👉 Por onde começar?

```
Você é…?

┌──────────────────────────┐    ┌──────────────────────────┐
│   Humano novo no time    │    │  Agente IA (Claude etc)  │
│   (dev, QA, PM, design)  │    │  pegando uma PBI         │
└────────────┬─────────────┘    └────────────┬─────────────┘
             │                               │
             ▼                               ▼
     humanos/comece-aqui.md          bots/reading-order.md
             │                               │
             ▼                               ▼
     humanos/trilhas.md              bots/principios.md
   (escolhe seu papel)               (não-negociáveis)
             │                               │
             ▼                               ▼
     Pega PBI em 09-pbis             Pega PBI em 09-pbis
                                     ou 11-pbis-detalhado
```

## 🧑 Para humanos

| Página | Pra quê |
|---|---|
| [comece-aqui.md](humanos/comece-aqui.md) | Onboarding em 10 min: clone → setup → primeira PR |
| [trilhas.md](humanos/trilhas.md) | Por papel: dev backend / front / QA / PM / DevOps com PBIs sugeridas |
| [glossario.md](humanos/glossario.md) | Termos do domínio e técnicos (1 linha cada) |
| [faq.md](humanos/faq.md) | Dúvidas previsíveis: RLS, fuso, migrations, multi-tenant |

## 🔄 Para todos (humano + bot)

| Página | Pra quê |
|---|---|
| [fluxo-desenvolvimento.md](fluxo-desenvolvimento.md) | Trunk-based + Vercel preview por PR + deploy prod auto. Checklist 🚀 Deploy padronizado por PBI |
| [pratica-commits.md](pratica-commits.md) | Conventional Commits + escopos do projeto + exemplos bons/ruins + breaking changes |

## 🤖 Para bots

| Página | Pra quê |
|---|---|
| [reading-order.md](bots/reading-order.md) | Qual doc ler antes de tocar em qual área do código |
| [principios.md](bots/principios.md) | 6 não-negociáveis + gatilhos de PARAR e perguntar |
| [patterns.md](bots/patterns.md) | Patterns a seguir: withTenant, Zod, Server Actions, datas |
| [anti-patterns.md](bots/anti-patterns.md) | O que NÃO fazer — gatilhos de rejeição em PR |

## 🗺️ Mapa visual da arquitetura

Abra [`docs/diagramas/index.html`](../diagramas/index.html) no browser:

1. **[Mapa mental](../diagramas/mapa-mental.svg)** — 8 ramos: atores, domínio, stack, segurança, fluxos, regras, ambientes, workflow
2. **[Fluxo cliente](../diagramas/fluxo-cliente.svg)** — booking 4 toques + email + ramos erro
3. **[Fluxo admin](../diagramas/fluxo-admin.svg)** — painel + ações que alteram dados
4. **[Arquitetura multi-tenant](../diagramas/arquitetura-multi-tenant.svg)** — 4 camadas com RLS
5. **[Algoritmo slot-calculator](../diagramas/algoritmo-slot-calculator.svg)** — coração do produto
6. **[Fluxo dev → prod](../diagramas/fluxo-dev-prod.svg)** — local → preview Vercel → prod auto

## 📑 Docs canônicos (fonte de verdade)

| # | Doc | Quando consultar |
|---|---|---|
| 00 | [Overview](../00-overview.md) | Mapa cru dos docs |
| 01 | [Visão de produto](../01-visao-produto.md) | Antes de propor escopo |
| 02 | [Arquitetura](../02-arquitetura.md) | Antes de criar pasta/abstração nova |
| 03 | [Modelo de dados](../03-modelo-dados.md) | Antes de tocar `prisma/schema.prisma` ou query |
| 04 | [Segurança](../04-seguranca.md) | Antes de tocar auth/middleware/input |
| 05 | [Testes](../05-testes.md) | Antes de escrever ou alterar teste |
| 06 | [Padrões de código](../06-padroes-codigo.md) | Naming, lint, commits, server vs client |
| 07 | [Regras de negócio](../07-regras-negocio.md) | RN-01..20: slots, conflito, cancel, fuso |
| 08 | [Protótipo](../08-prototipo.md) | Antes de mexer em tela (W-01..W-12) |
| 09 | [PBIs (canônico)](../09-pbis.md) | Pegar trabalho — AC completo |
| 10 | [Plano da semana](../10-plano-semana.md) | Cronograma D1-D7 |
| 11 | [PBIs detalhado (Trello)](../11-pbis-detalhado.md) | PBI quebrada em back/front/regra/testes |

## 🛠️ Ferramentas externas

| Onde | Pra quê |
|---|---|
| [Board Trello "Barbearia"](https://trello.com/b/hYZHvqGV/barbearia) | Doing/Review/Done dos 15 cards |
| Local: `pnpm db:studio` | Inspecionar dados no Postgres |
| Local: `pnpm dev` | App em `localhost:3000` |
| Local: `public/prototypes/system.html` | Protótipo navegável (sem Next) |

## 🔄 Manutenção desta wiki

- A wiki é um **portal**. Conteúdo de regra/arquitetura/schema **NÃO** vive aqui — vive em `docs/01..11`.
- Se uma página da wiki diverge da canônica, a canônica vence. Abre PR pra ajustar a wiki.
- Adicionar novo papel/persona? Edite [trilhas.md](humanos/trilhas.md) — não crie página separada.
- Adicionar novo termo? [glossario.md](humanos/glossario.md), 1 linha + link.
