# ❓ FAQ

> Perguntas que aparecem repetidamente. Se a sua não está aqui, abre uma issue + adiciona depois.

## 🏗️ Setup e ambiente

### `pnpm install` falha com erro de Node
Confere `node --version` ≥ 20. Se tiver `nvm`/`fnm`: `nvm use` (vai ler `.nvmrc` se existir).

### Docker não sobe o Postgres
1. `docker ps` — o `barbearia-postgres` tá rodando?
2. Porta 5432 já ocupada? `lsof -i :5432` (mac/linux) ou `netstat -ano | findstr :5432` (Windows). Se sim, pare o outro Postgres ou ajuste `DATABASE_URL` pra outra porta.
3. Sem Docker no PC? Use [Neon](https://neon.tech) (grátis) e cola a string de conexão em `DATABASE_URL`.

### Onde defino `NEXTAUTH_SECRET`?
`openssl rand -base64 32` → cola em `.env.local`. Qualquer string de 32+ chars resolve em dev.

### `pnpm db:push` reclama de RLS / role
Provavelmente sua connection string aponta pra `app_user` sem permissão de DDL. Em dev: use `app_migrator` ou `postgres` direto via `DIRECT_URL`. Detalhes em [03 §Connection roles](../../03-modelo-dados.md).

## 🔐 Multi-tenant e RLS

### Por que minha query retorna `[]` mesmo com dados no banco?
RLS bloqueou. Verifica:
- Está dentro de `withTenant(orgId, ...)`? Se não: `SELECT` retorna `[]`.
- `orgId` é o correto? Logue antes do `withTenant`.
- Conectou com `app_user` (default)? Se rodou seed direto sem tenant context, dados foram inseridos mas RLS bloqueia leitura.

Pra debugar, conecta no `psql` como `app_superuser` (BYPASSRLS) e confirma que os dados existem.

### Como criar dados pra teste sem RLS bater?
Em testes integration: usa `withTenant(testOrgId, ...)`. Em script seed: usa `DATABASE_ADMIN_URL` (conexão `app_superuser` com BYPASSRLS).

### Como vejo se EXCLUDE constraint pegou um conflito?
Erro Postgres: `23P01` (`exclusion_violation`). Prisma traduz pra erro com `code: 'P2002'` ou throw cru. Captura na Server Action e devolve mensagem amigável `"SLOT_UNAVAILABLE"`. Ver [PBI-08](../../11-pbis-detalhado.md#pbi-08--confirmação--criação-do-agendamento).

## 📅 Datas e fuso

### Por que datas no banco estão em UTC e não em SP?
Padrão: `timestamptz` sempre em UTC. Conversão pra `America/Sao_Paulo` só na borda — render ou input do usuário. Mudar fuso da org **não** converte agendamentos existentes. RN-13.

### Slot 09:00 com duração 30 e fim de expediente 09:30 — válido?
Sim. Range `[)`: vai até 09:30 mas não inclui. RN-CB-01.

### Próximo appt começando exatamente quando o anterior termina — conflita?
Não. Mesma lógica `[)`. EXCLUDE constraint usa `tstzrange(starts_at, ends_at, '[)')`.

## 🧪 Testes

### Onde escrevo qual teste?
- Função pura (slot-calculator, validators): `tests/unit/`
- Service com DB real (booking-service, RLS): `tests/integration/`
- Fluxo ponta-a-ponta (cliente reserva): `tests/e2e/`
- Componente isolado: `tests/unit/components/`

[Pirâmide completa em 05-testes.md](../../05-testes.md).

### Posso mockar o DB nos integration tests?
**Não.** Mock esconde bugs de SQL/RLS — exatamente o que esse projeto não pode ter. Use Postgres real em container ou em-process.

### Como rodo só 1 teste?
```bash
pnpm test slot-calculator           # pelo nome do arquivo
pnpm test -t "antecedência"         # pelo nome do it/describe
```

## 🎨 Frontend

### Server Component ou Client Component?
Default: **Server**. Use `"use client"` só pra `useState`/`useEffect`/eventos/browser API. [06 §Server vs Client](../../06-padroes-codigo.md).

### Como passo dados do server pro client?
Via prop serializada. Função NÃO passa (não serializa) — use Server Action invocada do client.

### Onde mexo em estilo (Tailwind)?
Classes inline no JSX. Componentes shadcn em `src/components/ui/` — **não editar**, é fonte do shadcn CLI. Se precisa customizar muito, copia pra `src/components/features/` e adapta.

## 🛠️ Workflow / git

### Posso usar `git push --force`?
Em sua branch pessoal: sim, com `--force-with-lease`. **Nunca** em `main`. Veja [CLAUDE.md §Executing actions with care](../../../CLAUDE.md).

### Posso commitar sem rodar testes (`--no-verify`)?
**Não** sem permissão explícita. Se hook está falhando, conserta a causa raiz, não pula.

### Como mover um card no Trello?
- Manual: arrasta da coluna "Task" pra "Doing" / "Review" / "Concluído".
- Via CLI/API: o script `scripts/trello-import.ps1` é só pra import inicial; mover é mais simples no UI.

## 🤖 Agentes IA

### Posso pedir pra um agente Claude pegar uma PBI?
Sim. Aponta ele pra:
1. [CLAUDE.md](../../../CLAUDE.md)
2. [bots/reading-order.md](../bots/reading-order.md)
3. O bloco da PBI específica em [11-pbis-detalhado.md](../../11-pbis-detalhado.md)

### Agente pode abrir PR?
Pode abrir. Humano aprova o merge. Veja [06 §Regras de review](../../06-padroes-codigo.md).

### Agente pode rodar migration?
Pode rodar `pnpm db:push` em dev. **Não** roda `pnpm db:migrate deploy` em prod sem confirmação humana.

## 📦 Deploy

### Como faço deploy?
Não-aplicável no MVP até PBI-14. Quando rolar, será Vercel + Neon. Detalhes em [PBI-14](../../11-pbis-detalhado.md#pbi-14--deploy-vercel--neon).

### Onde vejo logs de prod?
v2. No MVP, smoke test manual + `/api/health` (PBI-14).
