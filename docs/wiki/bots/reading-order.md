# 🤖 Reading order para agentes

> Você é um agente (Claude Code, Cursor, Copilot, etc.) entrando neste repo. Este doc te diz **o que ler antes de tocar em cada área do código** — leitura cara, mas evita PR rejeitada.

## 🛡️ Ordem mínima obrigatória (todo agente, toda vez)

1. **[CLAUDE.md](../../../CLAUDE.md)** — princípios não-negociáveis. Reler em sessão nova.
2. **[bots/principios.md](principios.md)** — gatilhos de PARAR e perguntar.
3. **[bots/anti-patterns.md](anti-patterns.md)** — o que rejeita PR automaticamente.

Isso é ~5 min. Sem isso, alta chance de a PR ser revertida.

## 🎯 Leitura adicional por área do código

### Vai mexer em `prisma/` (schema, migrations)
- [03-modelo-dados.md](../../03-modelo-dados.md) **inteiro** — incluindo políticas RLS e EXCLUDE constraint.
- [04-seguranca.md §RLS](../../04-seguranca.md) — como queries respeitam tenant.
- ⚠️ **2 reviewers humanos** obrigatórios na PR (CLAUDE.md §8).

### Vai mexer em `src/lib/auth.ts`, `src/middleware.ts`
- [04-seguranca.md](../../04-seguranca.md) **inteiro**.
- [03-modelo-dados.md §Membership](../../03-modelo-dados.md).
- ⚠️ **2 reviewers humanos**.

### Vai mexer em Server Action / API route
- [04-seguranca.md §Validação](../../04-seguranca.md) — Zod parse obrigatório.
- [06-padroes-codigo.md §Server Actions](../../06-padroes-codigo.md).
- [07-regras-negocio.md](../../07-regras-negocio.md) §RN relevantes à ação.
- [bots/patterns.md](patterns.md) §withTenant, §Server Action.

### Vai mexer em `src/lib/server/slot-calculator.ts` ou booking
- [07-regras-negocio.md §RN-03/04/05/06](../../07-regras-negocio.md) — todas as regras de slot.
- [diagramas/algoritmo-slot-calculator.svg](../../diagramas/algoritmo-slot-calculator.svg).
- [11-pbis-detalhado.md#PBI-06](../../11-pbis-detalhado.md#pbi-06--slot-calculator-coração-do-produto) — 15+ testes obrigatórios.

### Vai mexer em UI / component
- [06-padroes-codigo.md §Server vs Client + §Estrutura de feature](../../06-padroes-codigo.md).
- [08-prototipo.md](../../08-prototipo.md) — W-XX relevante.
- [06 §Acessibilidade](../../06-padroes-codigo.md) — checklist mínimo.
- Para tema/cores: tudo via Tailwind + CSS vars (`hsl(var(--primary))`).

### Vai mexer em test
- [05-testes.md](../../05-testes.md) — pirâmide, ferramentas, cobertura mínima.
- Para validators: 95% line coverage; para `src/lib/server/**`: 85%; global: 70%.

### Vai escrever um Server Action novo
Toda Server Action no projeto tem 4 obrigações fixas — não pule nenhuma:

```ts
"use server";
import { auth } from "@/lib/auth";
import { someSchema } from "@/lib/validators/some";
import { withTenant } from "@/lib/db";

export async function myAction(input: unknown) {
  // 1. Auth (se admin) + derive orgId do servidor
  const session = await auth();
  if (!session) throw new Error("Não autenticado");
  const orgId = session.user.memberships[0].organizationId;
  // (role check aqui se a ação exige OWNER)

  // 2. Zod parse — sempre primeiro
  const data = someSchema.parse(input);

  // 3. withTenant — toda query passa por aqui
  return withTenant(orgId, async (db) => {
    // ... lógica
  });
}
```

Detalhado em [patterns.md](patterns.md).

## 🧭 Quando você não tem certeza

Em ordem de fallback:
1. **Releu o doc canônico relevante?** Sempre tem a resposta — `docs/01..11`.
2. **Olhou o diagrama?** Texto às vezes é abstrato demais — `docs/diagramas/`.
3. **Tem uma PBI análoga já feita?** Veja `git log` por arquivos parecidos.
4. **PARE e pergunte ao humano.** Trigger list em [principios.md §Quando parar](principios.md#-quando-parar-e-perguntar).

## ❌ Erros comuns de agentes neste repo

| Erro | Por que erra | Como evitar |
|---|---|---|
| Cria query sem `withTenant` | Acha que filtrar por `organizationId` na query do Prisma basta | Sempre `withTenant`. RLS é o backstop, mas a app **também** marca tenant. |
| `where: { organizationId }` recebendo orgId via prop/form | Vaza tenant se cliente sobrepor o campo | orgId vem da sessão ou do slug resolvido, **nunca** do cliente. |
| Adiciona `any` "temporário" | "Vou tipar depois" — não vai | Use `unknown` + narrowing, ou crie o tipo. |
| `// @ts-ignore` | Apaga problema sem resolver | `@ts-expect-error` com comentário OU resolve a causa. |
| Server Action sem Zod | "É só um campo, validação no client basta" | Toda SA começa com `schema.parse`. Sem exceção. |
| Comparar datas com strings | Locale bites you | `date-fns` + `date-fns-tz`. Banco em UTC sempre. |
| Comentário "// adicionado para PBI-XX" | Roda na PR description, polui código | Não escreva. Comentários só para WHY não-óbvio. |
| Faz refactor "de quebra" durante bug fix | Bloat de PR + risco | Bug fix = só o fix. Refactor em PR separada. |

## 📚 Atalhos úteis

| O que você quer | Vai em |
|---|---|
| Pegar uma PBI estruturada | [11-pbis-detalhado.md](../../11-pbis-detalhado.md) |
| Ver AC completo da PBI | [09-pbis.md](../../09-pbis.md) (canônico) |
| Entender uma regra de negócio | [07-regras-negocio.md](../../07-regras-negocio.md) |
| Ver onde código deve morar | [02-arquitetura.md](../../02-arquitetura.md) §Estrutura |
| Ver convenção de naming/lint | [06-padroes-codigo.md](../../06-padroes-codigo.md) |
| Ver fluxo visual | [docs/diagramas/index.html](../../diagramas/index.html) |
