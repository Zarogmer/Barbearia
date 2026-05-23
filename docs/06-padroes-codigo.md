# 06 — Padrões de código

## TypeScript

- `tsconfig.json` com `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- **Nunca** `any`. Em casos extremos, `unknown` + narrowing.
- **Nunca** `@ts-ignore`. `@ts-expect-error` aceitável com comentário explicando.
- Tipos preferidos:
  - `type` para uniões, primitivos, mapeamentos.
  - `interface` para shapes de objeto extensíveis.
- Exports nomeados, não default (exceto em `page.tsx`, `layout.tsx` onde Next exige).

## ESLint + Prettier

`eslint.config.mjs` baseado em `next/core-web-vitals` + `@typescript-eslint/recommended-type-checked`.

Regras adicionais não-negociáveis:

```js
"@typescript-eslint/no-explicit-any": "error",
"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
"@typescript-eslint/consistent-type-imports": "error",
"@typescript-eslint/no-floating-promises": "error",
"@typescript-eslint/no-misused-promises": "error",
"react/jsx-key": "error",
"react-hooks/exhaustive-deps": "error",
"no-console": ["warn", { allow: ["warn", "error"] }],
"import/order": ["error", { groups: [...], "newlines-between": "always" }],
```

Prettier:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Husky + lint-staged em `pre-commit`: roda `eslint --fix` e `prettier --write` nos arquivos staged.

## Naming

| O quê | Convenção | Exemplo |
|---|---|---|
| Componente React | `PascalCase` | `ServicePicker.tsx` |
| Hook | `camelCase` com prefixo `use` | `useToast.ts` |
| Função/variável | `camelCase` | `calculateAvailableSlots` |
| Type/Interface | `PascalCase` | `BookingInput` |
| Constante exportada | `SCREAMING_SNAKE_CASE` | `MAX_BOOKING_DAYS_AHEAD` |
| Arquivo não-componente | `kebab-case` | `slot-calculator.ts` |
| Pasta | `kebab-case` | `booking-service/` |
| Server Action | verbo no infinitivo | `createBooking`, `cancelAppointment` |
| Zod schema | sufixo `Schema` | `createBookingSchema` |
| Tipo inferido de Zod | sem sufixo | `type CreateBookingInput = z.infer<...>` |

## Server vs Client Components

**Padrão = Server Component.** Use `"use client"` apenas quando precisa de:

- `useState`, `useEffect`, `useRef`, `useContext`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)
- Bibliotecas que dependem do acima

Exemplos:

```tsx
// ✅ Server Component (padrão)
import { getServices } from "@/lib/server/services";

export default async function ServicesPage() {
  const services = await getServices();
  return <ServiceList services={services} />;
}
```

```tsx
// ✅ Client Component (necessário)
"use client";
import { useState } from "react";

export function ServicePicker({ services, onSelect }) {
  const [selected, setSelected] = useState<string>();
  return <>{/* ... */}</>;
}
```

**Anti-pattern:** passar funções de Server Component para Client Component como prop (não serializa). Use Server Actions.

## Estrutura de um arquivo de feature

```tsx
// src/components/features/booking/ServicePicker.tsx
"use client";

// 1. Imports — ordem: react > next > terceiros > @/ > relativos
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn, formatBRL } from "@/lib/utils";

import type { Service } from "@/types/domain";

// 2. Tipos do arquivo (props, locais)
type ServicePickerProps = {
  services: Service[];
  onSelect: (service: Service) => void;
  className?: string;
};

// 3. Componente
export function ServicePicker({ services, onSelect, className }: ServicePickerProps) {
  const [selected, setSelected] = useState<string>();

  return (
    <div className={cn("grid gap-3", className)}>
      {services.map((s) => (
        <Button
          key={s.id}
          variant={selected === s.id ? "default" : "outline"}
          onClick={() => {
            setSelected(s.id);
            onSelect(s);
          }}
        >
          <span>{s.name}</span>
          <span className="ml-auto">{formatBRL(s.priceCents)}</span>
        </Button>
      ))}
    </div>
  );
}
```

## Server Actions

```ts
// src/app/(public)/[orgSlug]/agendar/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBookingSchema } from "@/lib/validators/booking";
import { createBooking } from "@/lib/server/booking-service";
import { resolveOrgBySlug } from "@/lib/server/tenant-context";

export async function confirmBookingAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const input = createBookingSchema.parse(raw);

  const orgSlug = raw.orgSlug as string;
  const org = await resolveOrgBySlug(orgSlug);
  if (!org) throw new Error("Organização não encontrada");

  const booking = await createBooking(org.id, input);

  revalidatePath(`/${orgSlug}/agendar`);
  redirect(`/${orgSlug}/agendamento/${booking.id}`);
}
```

**Regras:**

1. Primeira linha: `"use server"` (arquivo) ou função inline em RSC.
2. Sempre `.parse()` Zod antes de lógica.
3. Sempre derive `organizationId` do servidor (sessão ou slug), **nunca** confie em campo do form.
4. `revalidatePath` ou `revalidateTag` depois de mutação.
5. `redirect` por último (joga exception).

## Imports

Ordem obrigatória (via `import/order`):

1. Built-in / React
2. Next.js
3. Terceiros (`zod`, `bcrypt`, etc.)
4. Internos `@/`
5. Relativos `./`
6. Tipos: bloco separado, prefixo `import type`

```ts
import { useState } from "react";

import { redirect } from "next/navigation";

import { z } from "zod";

import { Button } from "@/components/ui/button";
import { createBooking } from "@/lib/server/booking-service";

import { formatDate } from "./helpers";

import type { Service } from "@/types/domain";
```

## Conventional Commits

Formato: `<tipo>(<escopo opcional>): <descrição>`

| Tipo | Quando |
|---|---|
| `feat` | nova funcionalidade |
| `fix` | bug fix |
| `chore` | tarefa de manutenção (deps, config) |
| `docs` | só documentação |
| `refactor` | refatoração sem mudar comportamento |
| `test` | só testes |
| `perf` | melhoria de performance |
| `style` | formatação |
| `ci` | pipelines |

Exemplos:

- `feat(booking): add slot conflict validation`
- `fix(auth): clear stale session on logout`
- `docs(architecture): document RLS approach`
- `refactor(slot-calculator): extract weekday helper`
- `chore(deps): bump prisma to 5.20`

Breaking change: `feat(api)!: change appointment payload shape` + footer `BREAKING CHANGE: ...`.

## Branching

Trunk-based simplificado:

- `main` é sempre deployável.
- Feature branches curtas (`feat/slug`, `fix/slug`, `chore/slug`).
- Vida média de branch: **< 2 dias**.
- Rebase sobre `main` antes de PR. **Sem merge commits em feature → main** (squash merge).
- Tags semver no `main` para releases (`v0.1.0`, `v0.1.1`, ...). MVP fecha em `v0.1.0`.

## Pull Requests

Template (`.github/pull_request_template.md`):

```md
## O que mudou

<resumo em 1-3 linhas>

## PBI relacionada

<link para docs/09-pbis.md#pbi-NN>

## Como testar

- [ ] passos
- [ ] expectativa

## Checklist

- [ ] Lint passou
- [ ] Typecheck passou
- [ ] Testes unit/integration passaram
- [ ] Testes E2E relevantes rodados localmente
- [ ] Docs atualizados (se aplicável)
- [ ] Schema/migration revisado (se aplicável)
- [ ] Sem segredos commitados

## Screenshots / vídeo

<obrigatório se mudou UI>
```

### Regras de review

- **2 reviewers** para mudanças em `prisma/`, `src/middleware.ts`, `src/lib/auth.ts`, ou políticas RLS.
- **1 reviewer** para o resto.
- Agente Claude pode abrir PR mas humano aprova merge no MVP.

## Tratamento de erros

- **Server Action / API:** lança exception → caught pelo `error.tsx` da rota.
- **Client component:** `try/catch` em handler; mostra `toast` com mensagem amigável; logar com `console.error`.
- **Nunca** swallowing silencioso (`catch {}` vazio).
- Mensagens de erro ao usuário em **PT-BR**, sem stack trace, sem detalhes técnicos.

## Comentários

Default: **não escrever**.

Escreva comentário só se:

- A intenção do código não fica óbvia pelo nome.
- Há uma decisão não-trivial (workaround de bug, constraint de fuso, etc.).
- Há um TODO com link de issue.

**Não escreva**:

- "// função que retorna o nome" sobre `getName()`
- "// adicionado para fix issue #123"
- "// removido — não usar"

Para tudo isso, use git blame e PR description.

## Internacionalização

MVP é PT-BR-only. **Não** adicione i18n agora (overhead sem retorno). Strings ficam em PT-BR no JSX. v2 extrai para JSON quando houver demanda.

## Performance — regras de bolso

- **Imagens:** `next/image` sempre, com `width/height` declarados.
- **Fontes:** `next/font` (Inter ou Geist), evita CLS.
- **Listas grandes:** virtualizar se > 100 itens visíveis (Tanstack Virtual em v2).
- **Query N+1:** sempre `include`/`select` no Prisma; revisar query plan em integration tests.
- **Server Component > Client Component** para reduzir JS bundle.
- **`dynamic(() => import(...))`** para components pesados que aparecem condicionalmente.

## Acessibilidade — checklist mínimo

- Botões usam `<button>`, não `<div onClick>`.
- Inputs têm `<label>` associado.
- Imagens têm `alt`.
- Contraste mínimo AA (4.5:1).
- Foco visível (não remover `outline`).
- Trap de foco em modal (shadcn já faz).
- Testes RTL usam `getByRole` (força semântica correta).
