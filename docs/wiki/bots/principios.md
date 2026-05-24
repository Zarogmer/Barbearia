# 🤖 Princípios não-negociáveis

> Cada princípio aqui é gatilho automático pra rejeitar PR ou abortar tool call. Decorou? Bom. Vai cair na prova (PR review).

## 1. Multi-tenant: todo dado pertence a uma `Organization`

- Toda tabela de negócio tem `organizationId` (UUID, NOT NULL, indexed).
- Toda query Prisma roda dentro de `withTenant(orgId, fn)`.
- `orgId` deriva da **sessão** (admin) ou do **slug resolvido pelo middleware** (público). **Nunca** vem de campo do form/client.
- Banco tem RLS ativado. Mesmo com bug de código, banco não devolve dados de outro tenant.

**Por quê:** vazar dados de tenant é o pior bug que esse SaaS pode ter. Acaba com confiança e expõe legalmente.

**Onde aprofundar:** [03-modelo-dados.md](../../03-modelo-dados.md), [04-seguranca.md](../../04-seguranca.md), [diagramas/arquitetura-multi-tenant.svg](../../diagramas/arquitetura-multi-tenant.svg).

## 2. Validação Zod em toda fronteira

- Todo Server Action: 1ª linha após `"use server"` é `schema.parse(input)`.
- Toda API route: 1ª linha é `schema.parse(await req.json())`.
- Schemas em `src/lib/validators/*.ts`, reusados em `react-hook-form` (`zodResolver`) e no server.
- TS type NÃO é validação — `as Foo` em input externo é bug latente.

**Por quê:** TS é apagado no runtime. Sem Zod, qualquer cliente pode mandar qualquer payload.

## 3. Segredos nunca em código

- Sem `.env` no git. Só `.env.example` com placeholders.
- Sem `process.env.X` em arquivo com `"use client"`. Pra expor pro browser: prefixo `NEXT_PUBLIC_`.
- Sem hardcode de API key, token, password — nem em testes, nem em comentário, nem em mock.

## 4. Sem `any`, sem `@ts-ignore`, sem `eslint-disable` casual

- `any` precisa de comentário + issue linkada pra remover.
- `@ts-expect-error` aceitável com comentário; `@ts-ignore` **proibido**.
- `eslint-disable-next-line` só se tiver razão *forte* + comentário explicando.

## 5. Server Components por padrão

- `"use client"` só quando precisar de estado, evento ou browser API.
- Reduz JS no cliente, melhora perf.

## 6. Datas em UTC no banco, fuso na borda

- Prisma `DateTime` → Postgres `timestamptz` em UTC.
- Conversão pra `America/Sao_Paulo` apenas na render ou input do user, via `date-fns-tz`.
- Aritmética de data **nunca** com strings — sempre `Date` + `date-fns`.

---

## 🛑 Quando PARAR e perguntar

Esses gatilhos te obrigam a parar tool call e perguntar ao humano antes de prosseguir:

### Gatilhos arquiteturais
- Mudar `prisma/schema.prisma` (afeta migração + RLS)
- Mudar `src/lib/auth.ts` (afeta toda sessão)
- Mudar `src/middleware.ts` (afeta toda request)
- Mudar política RLS em migration SQL
- Adicionar lib nova em `package.json` (peso, manutenção, alternativa nativa?)

### Gatilhos de blast-radius
- Force push em qualquer branch (especialmente `main`)
- `git reset --hard` que descarta trabalho
- `rm -rf` em pasta versionada
- Deletar branches remotas
- Push em `main` direto (sem PR)
- `pnpm db:migrate deploy` em prod
- Rodar comando que **muda dados de produção**

### Gatilhos de escopo
- A PBI fala "feature X", mas você percebe que precisa refatorar Y também
- Você ia adicionar "validação extra por segurança" mas a PBI não pede
- Você ia criar "abstração porque pode ser útil depois"

→ **Pare.** Faça só o que a PBI pede. Mencione o que viu (1 linha) e pergunte se quer issue separada.

### Gatilhos de incerteza
- "Não tenho certeza se essa decisão respeita RN-XX"
- "A regra parece ambígua entre AC e doc canônico"
- "Esse trade-off muda a UX, alguém precisa olhar"

→ **Pergunte.** Custo de perguntar é baixo; custo de uma decisão errada é alto.

---

## ✅ Quando NÃO precisa perguntar

Esses são reversíveis e locais — execute sem confirmar:

- Editar/criar arquivos em `src/` que a PBI pede.
- Rodar `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Rodar `pnpm db:push` em dev local.
- Rodar `pnpm db:seed` em dev local (idempotente).
- Rodar `pnpm dev` (servidor local).
- `git add` / `git commit` em branch tua.
- `git checkout -b feat/...`.
- Ler qualquer arquivo do projeto.

---

## 📐 Princípio do "small steps"

Antes de uma sessão grande:

1. **Lê** o doc + PBI relevantes. Não mexe em nada.
2. **Plano** explícito em texto pro humano se for mais de 3-4 mudanças.
3. **Executa** uma mudança por vez — typecheck verde antes de seguir.
4. **Diff pequeno** — PR média neste repo: < 300 linhas adicionadas.

Se você precisa de PR com > 500 linhas, é sinal de que a PBI deveria ter sido quebrada. Mencione isso.
