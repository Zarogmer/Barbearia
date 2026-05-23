# Overview da documentação

Este diretório é a **fonte única de verdade** sobre o produto, a arquitetura e como trabalhamos. Atualize aqui antes (ou junto) das mudanças de código — docs desatualizado é pior que doc inexistente.

## Mapa dos documentos

| # | Doc | Tema | Audiência primária |
|---|---|---|---|
| 00 | [Overview](00-overview.md) | Este arquivo | Todos |
| 01 | [Visão de produto](01-visao-produto.md) | Problema, persona, escopo MVP, KPIs | PM, devs, stakeholders |
| 02 | [Arquitetura](02-arquitetura.md) | Stack, estrutura, ADRs, deploy | Devs, agentes |
| 03 | [Modelo de dados](03-modelo-dados.md) | Schema Prisma, ER, multi-tenant + RLS | Devs backend, DBA |
| 04 | [Segurança](04-seguranca.md) | Auth, RLS, OWASP, validação | Devs, SecOps |
| 05 | [Testes](05-testes.md) | Pirâmide, ferramentas, CI gates | Devs, QA |
| 06 | [Padrões de código](06-padroes-codigo.md) | TS strict, lint, commits, naming | Devs, agentes |
| 07 | [Regras de negócio](07-regras-negocio.md) | Slots, conflito, cancelamento, fuso | PM, devs, QA |
| 08 | [Protótipo](08-prototipo.md) | Fluxos e wireframes | Designers, devs front, PM |
| 09 | [PBIs](09-pbis.md) | Backlog priorizado | Time inteiro |
| 10 | [Plano da semana](10-plano-semana.md) | Cronograma D1-D7 | PM, time |

## Leitura sugerida por papel

### Sou **agente Claude Code** entrando no projeto

1. [CLAUDE.md](../CLAUDE.md) — princípios não-negociáveis
2. [02-arquitetura.md](02-arquitetura.md) — onde as coisas vivem
3. [03-modelo-dados.md](03-modelo-dados.md) — entidades + RLS
4. [04-seguranca.md](04-seguranca.md) — antes de tocar em qualquer input
5. [06-padroes-codigo.md](06-padroes-codigo.md) — convenções
6. [09-pbis.md](09-pbis.md) — pegue uma PBI

### Sou **dev frontend humano** entrando no projeto

1. [01-visao-produto.md](01-visao-produto.md) — o quê
2. [08-prototipo.md](08-prototipo.md) — telas e fluxos
3. [02-arquitetura.md](02-arquitetura.md) — onde código mora
4. [06-padroes-codigo.md](06-padroes-codigo.md) — server vs client components
5. [05-testes.md](05-testes.md) — como testar componentes
6. [09-pbis.md](09-pbis.md) — pegue uma PBI

### Sou **dev backend humano** entrando no projeto

1. [01-visao-produto.md](01-visao-produto.md) — o quê
2. [03-modelo-dados.md](03-modelo-dados.md) — schema
3. [04-seguranca.md](04-seguranca.md) — auth + RLS
4. [07-regras-negocio.md](07-regras-negocio.md) — invariantes do domínio
5. [05-testes.md](05-testes.md) — como testar services
6. [09-pbis.md](09-pbis.md) — pegue uma PBI

### Sou **PM / produto**

1. [01-visao-produto.md](01-visao-produto.md)
2. [07-regras-negocio.md](07-regras-negocio.md)
3. [08-prototipo.md](08-prototipo.md)
4. [10-plano-semana.md](10-plano-semana.md)
5. [09-pbis.md](09-pbis.md) — para priorização e refinamento

### Sou **QA**

1. [01-visao-produto.md](01-visao-produto.md)
2. [07-regras-negocio.md](07-regras-negocio.md) — base dos casos de teste
3. [05-testes.md](05-testes.md) — ferramentas e estratégia
4. [09-pbis.md](09-pbis.md) — AC define o que validar

## Convenção de atualização dos docs

- **Toda PBI que muda comportamento de domínio** atualiza `07-regras-negocio.md` na mesma PR.
- **Toda mudança de schema** atualiza `03-modelo-dados.md`.
- **Toda decisão de arquitetura** vira ADR em `02-arquitetura.md`.
- **PRs que só mexem em `docs/`** podem dispensar review técnico, mas precisam de aprovação do PM/dono.
