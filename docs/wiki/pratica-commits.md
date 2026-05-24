# ✍️ Prática de commits

> [Conventional Commits](https://www.conventionalcommits.org/pt-br/) é mandatório. Mensagem ruim = PR rejeitada. Padrão original em [06-padroes-codigo.md](../06-padroes-codigo.md); aqui são escopos do projeto + exemplos práticos.

## 🧱 Formato

```
<tipo>(<escopo>): <descrição curta no imperativo>

[corpo opcional explicando o porquê]

[footer opcional: BREAKING CHANGE, refs]
```

Regras:
- **Tipo**: lowercase, lista abaixo.
- **Escopo**: opcional, lowercase, área do código (ver lista).
- **Descrição**: imperativo ("add", "fix", "remove"), sem ponto final, máximo 72 chars na primeira linha.
- **Corpo**: explica WHY, não WHAT. Quebra em 72 chars.
- **Footer**: `BREAKING CHANGE:`, `Refs: PBI-04`, `Closes: #42`, `Co-Authored-By:`.

## 🏷️ Tipos válidos

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat` | Funcionalidade nova visível | `feat(booking): add slot conflict validation` |
| `fix` | Bug fix | `fix(auth): clear stale session on logout` |
| `refactor` | Reorganiza código sem mudar comportamento | `refactor(slot-calculator): extract weekday helper` |
| `perf` | Melhoria de performance | `perf(agenda): avoid N+1 in day view query` |
| `test` | Apenas testes | `test(slot-calculator): cover advance time edge cases` |
| `docs` | Apenas documentação | `docs(rls): document FORCE ROW LEVEL SECURITY` |
| `chore` | Manutenção (deps, config sem mudança de runtime) | `chore(deps): bump prisma to 5.20` |
| `style` | Formatação, espaços (raro — Prettier resolve) | `style: apply prettier to legacy file` |
| `ci` | GitHub Actions, workflows | `ci: cache pnpm store across jobs` |
| `build` | Webpack, tsconfig, build pipeline | `build: enable noUncheckedIndexedAccess` |

## 🎯 Escopos do projeto

Use o escopo pra dar contexto rápido. Lista canônica (sinta-se livre pra criar novo se faz sentido):

### Backend
- `auth` — NextAuth, Credentials, OAuth, session
- `db` — schema Prisma, queries, withTenant
- `rls` — políticas Row Level Security
- `booking` — booking-service, createBooking
- `slot-calculator` — função pura de slots
- `agenda` — getDayAgenda, ações da agenda admin
- `services` — CRUD Service
- `professionals` — CRUD Professional, WorkingHours, TimeBlock
- `org` — Organization, settings
- `email` — Resend, templates

### Frontend
- `landing` — página pública `/[orgSlug]`
- `booking-ui` — fluxo cliente W-02..W-06
- `admin-agenda` — view agenda do dia
- `admin-services` — CRUD services UI
- `admin-pros` — CRUD profissionais UI
- `admin-settings` — configurações da org
- `ui` — primitivas (shadcn wrappers, layout)

### Infra
- `ci` — GitHub Actions
- `deploy` — Vercel, Neon
- `docker` — docker-compose
- `seed` — prisma/seed.ts

### Outros
- `deps` — bumps de dependências
- `wiki` — pasta `docs/wiki/`
- `pbi-NN` — quando o commit fecha exatamente uma PBI

## 📝 Exemplos bons

```
feat(booking): add slot conflict validation

Antes da criação do appointment, recalculamos os slots disponíveis pelo
slot-calculator pra detectar race (2 abas selecionando mesmo horário).
EXCLUDE no DB é o backstop, mas erro vira mensagem amigável.

Refs: PBI-08, RN-04
```

```
fix(rls): force row level security on services table

Sem FORCE, owner da tabela (app_migrator que rodou migrations) ignorava
a policy. app_user agora obedece corretamente — testes de cross-tenant
voltam a passar.

Refs: PBI-11
```

```
refactor(slot-calculator): inject `now` as parameter

Permite testar antecedência mínima sem mock global de Date.
Sem mudança de comportamento.
```

```
docs(wiki): add fluxo-desenvolvimento e pratica-commits

Trunk-based + Vercel preview + auto prod aprovado em 2026-05-23.
```

```
chore(deps): bump next to 15.0.3

Patch release, sem migrations necessárias.
```

## 🚨 Exemplos ruins (rejeitar)

| Mensagem | Por quê é ruim | Fix |
|---|---|---|
| `update code` | sem tipo, sem escopo, sem info | `fix(auth): handle expired session redirect` |
| `WIP` | não merge WIP em main | finaliza ou squash com mensagem real |
| `feat: stuff` | descrição genérica | `feat(booking): show confirmation step` |
| `feat: ADD BOOKING` | maiúsculas | `feat(booking): add booking creation flow` |
| `fix: corrige bug` | que bug? | `fix(slot-calculator): handle 0-duration service` |
| `feat(booking): add booking creation flow.` | ponto final | remove o ponto |
| `feat: lots of changes across the codebase` | escopo enorme | quebra em commits menores OU PR menor |

## 💥 Breaking changes

Quando uma mudança quebra contrato externo (API pública, schema irreversível, comportamento de UI que cliente conta):

```
feat(api)!: change appointment payload shape

Antes: { startsAt, endsAt }
Depois: { startsAt, duration } (servidor calcula endsAt)

BREAKING CHANGE: clientes que dependem do campo endsAt devem
mudar para calcular localmente ou consumir /appointments/:id que
ainda retorna ambos.

Refs: PBI-XX
```

- `!` depois do escopo (visual rápido).
- Footer `BREAKING CHANGE:` obrigatório.
- No MVP: evitar breaking changes — todas as APIs internas ainda.

## 🪝 Pre-commit hook (Husky)

Quando rodar `git commit`:
1. `lint-staged` roda `eslint --fix` + `prettier --write` nos arquivos staged.
2. Falhou? Commit abortado, ajusta e re-commit.
3. **Não usar `--no-verify`** salvo emergência absoluta — se hook falhou, conserta a causa.

Setup local após clonar:
```bash
pnpm install
pnpm prepare    # instala hooks Husky
```

## 🪞 Atomicidade

Cada commit deveria:
- Compilar isoladamente (`pnpm typecheck` verde após ele)
- Testes verdes (ou ser commit explícito de teste antes do fix — TDD)
- Ter 1 propósito (não "feat + refactor + test fix" no mesmo commit)

Se a feature exige 5 mudanças relacionadas, OK ter 5 commits — squash merge consolida no fim.

## 🔁 Squash merge (default)

PR → main usa **squash merge**:
- Todos os commits da branch viram 1 commit em main.
- Mensagem do squash = título do PR + descrição.
- **Por isso o título do PR importa.** Use mesmo formato de Conventional Commit.

```
PR title: feat(booking): add slot conflict validation
                   ↓ squash
main commit: feat(booking): add slot conflict validation (#42)
```

## 🤖 Para agentes IA

- Commit message do agente DEVE seguir Conventional Commits.
- Footer obrigatório se o agente é Claude:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Não usar `--no-verify` nem `--amend` sem instrução humana explícita.

## 📚 Referências

- [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
- [06-padroes-codigo.md §Branching/PRs](../06-padroes-codigo.md)
- [fluxo-desenvolvimento.md](fluxo-desenvolvimento.md) — onde os commits chegam
