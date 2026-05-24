# 🔄 Fluxo de desenvolvimento (local → dev → prod)

> Estratégia: **trunk-based** + Vercel preview automático por PR + deploy prod automático após merge em `main`.
> Aprovado em 2026-05-23. Aplica-se a TODAS as PBIs.

## 🌳 Ambientes (3 níveis)

| Ambiente | URL | Quem aciona | Banco | Pra quê |
|---|---|---|---|---|
| **Local** | `localhost:3000` | `pnpm dev` | Postgres local (docker) | Desenvolvimento ativo |
| **Preview (= dev)** | `<branch>--barbearia.vercel.app` | abre/atualiza PR | Neon branch `preview` | QA, demo interna, validação de cliente antes do merge |
| **Produção** | `barbearia.vercel.app` (custom domain em v2) | merge em `main` | Neon branch `main` | Cliente real |

Cada PR ganha uma URL única (gerada pelo Vercel) — esse é o "ambiente dev" do PR. Não interfere com prod nem com outros PRs.

## 🔀 Estratégia de branches

```
main ───────●───────●───────●───────●───────●─────→  (sempre deployável)
            ▲       ▲       ▲       ▲       ▲
            │       │       │       │       │ squash merge
       feat/a  feat/b  fix/c  feat/d  chore/e
       (curtas, < 2 dias de vida)
```

- `main` é sempre deployável. Cada commit em main = deploy automático em prod.
- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `refactor/<slug>`.
- **Rebase sobre main antes de PR.** Sem merge commits em main (squash merge).
- Vida média de branch: **< 2 dias**. Branch parada > 1 semana sem PR é flag.

## 🚦 Fluxo padrão de uma PBI

```
1. Pega PBI no Trello (Task → Doing)
2. git checkout main && git pull
3. git checkout -b feat/<slug-da-pbi>
4. Implementa + escreve testes na MESMA branch
5. pnpm typecheck && pnpm lint && pnpm test:run  ← local OK
6. git push -u origin feat/<slug>
7. Abre PR contra main (gh pr create --fill)

     ↓ CI dispara automaticamente
     ↓ Vercel cria preview URL: feat-slug--barbearia.vercel.app

8. Compartilha preview URL no PR + canal do time
9. QA / cliente testa no preview
10. Reviewer humano aprova (2 se mexer em prisma/auth/middleware/RLS)
11. Squash merge em main → CI roda full + deploy prod automático
12. Smoke em prod (3 min):
    - GET /api/health → 200
    - Login admin demo → dashboard carrega
    - Fluxo crítico da PBI funciona end-to-end
13. Move card Trello para Concluído
14. Avisa cliente no canal (se feature visível)
```

[Veja o diagrama visual](../diagramas/fluxo-dev-prod.svg).

## ✅ Checklist 🚀 Deploy (em TODA PBI)

Cole isso no card Trello / PR checklist:

```markdown
### 🚀 Deploy
- [ ] `pnpm typecheck && pnpm lint && pnpm test:run` verde local
- [ ] Branch `feat/<slug>` criada de `main` atualizado
- [ ] PR aberta → CI verde + Vercel preview URL no PR
- [ ] Smoke da feature no preview (link compartilhado)
- [ ] Screenshot/vídeo no PR body (se mudou UI)
- [ ] Reviewer aprovou (2 se prisma/auth/middleware/RLS)
- [ ] Squash merge em main → deploy prod automático
- [ ] Smoke prod: /api/health 200 + fluxo da PBI funciona
- [ ] Card Trello movido para Concluído
- [ ] Cliente avisado no canal (se feature visível)
```

Itens N/A: marca como `[N/A]` com 1 linha justificando.

## 🎯 Critérios de aprovação por etapa

### Local → PR
- `pnpm typecheck` zero error
- `pnpm lint` zero error/warn novo
- `pnpm test:run` 100% verde
- Diff < 300 linhas (se maior, justificar — provável sinal de quebrar PBI)

### PR → merge
- CI verde (lint + typecheck + test-unit + test-integration + test-e2e)
- Vercel preview deploy OK
- 1 reviewer humano aprovou (2 se mexe em área crítica)
- Coverage não caiu abaixo dos pisos: global 70%, `src/lib/server/**` 85%, `src/lib/validators/**` 95%
- PBI linkada no PR body
- Screenshots se UI

### Merge → prod
Automático. Smoke manual após deploy:
- `/api/health` retorna 200 + `{ db: "ok" }`
- Login admin demo funciona
- 1 fluxo crítico passa (varia por PBI)

## 🚨 Rollback

Deu ruim em prod? **Rollback antes de investigar.**

```bash
# Opção 1 (mais rápida): redeploy do commit anterior pelo Vercel UI
#  → Vercel Dashboard → Deployments → ⋯ → "Promote to Production"

# Opção 2: revert no git
git revert <commit-hash>
git push origin main
# CI deploya o revert automático
```

Tempo alvo: rollback em **< 5 min**.

Comunicação:
1. Reverter primeiro, comunicar depois (incidente curto).
2. Comentário no PR original explicando o motivo.
3. Issue/PBI de fix se necessário.

## 🔐 Segredos em cada ambiente

| Ambiente | Onde os secrets vivem |
|---|---|
| Local | `.env.local` (gitignored) |
| Preview | Vercel env vars com escopo `Preview` |
| Prod | Vercel env vars com escopo `Production` |

Adicionar novo secret: Vercel Dashboard → Project → Settings → Environment Variables → escopo correto.

⚠️ **Nunca** committar `.env.local`. Veja [bots/principios.md §Segredos](bots/principios.md).

## 📊 Observabilidade (mínimo no MVP)

| Sinal | Como ver |
|---|---|
| Build/deploy status | Vercel Dashboard → Deployments |
| App vivo? | `GET /api/health` (PBI-14) |
| Erro 5xx em prod | Vercel Functions logs (v2 adiciona Sentry) |
| Latência | Vercel Analytics (v2 melhora) |

## 🔁 Releases

- **Tags semver no main** quando fechar marco: `v0.1.0` = MVP, `v0.1.1` = patch, `v0.2.0` = features novas pós-MVP.
- Cria release no GitHub com changelog auto-gerado (`gh release create v0.1.0 --generate-notes`).
- MVP fecha em `v0.1.0` ao final do D7.

## 📚 Referências

- [06-padroes-codigo.md §Branching/PRs](../06-padroes-codigo.md) — convenções de branch/commit/PR
- [pratica-commits.md](pratica-commits.md) — Conventional Commits estendido
- [diagramas/fluxo-dev-prod.svg](../diagramas/fluxo-dev-prod.svg) — visual
- [PBI-13 (CI)](../11-pbis-detalhado.md#pbi-13--ci-no-github-actions) — pipeline detalhado
- [PBI-14 (Deploy)](../11-pbis-detalhado.md#pbi-14--deploy-vercel--neon) — setup Vercel+Neon
