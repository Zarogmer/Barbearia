# 🤖 Anti-patterns

> O que NÃO fazer. Cada item aqui é gatilho de rejeição automática em PR review. Se você se vê fazendo isso, pare e re-leia [patterns.md](patterns.md).

## 🔥 Anti-patterns críticos (rejeição imediata)

### ❌ orgId vindo do client
```ts
// ERRADO
export async function createBooking(formData: FormData) {
  const orgId = formData.get("organizationId");  // cliente decide?? não.
  return withTenant(orgId, ...);
}
```
```ts
// CERTO
export async function createBooking(formData: FormData) {
  const orgSlug = formData.get("orgSlug");
  const org = await getOrgBySlug(orgSlug);  // servidor resolve
  return withTenant(org.id, ...);
}
```
**Por quê:** se cliente pode mandar orgId, cliente pode mandar orgId de outro tenant. Game over.

### ❌ Query sem `withTenant`
```ts
// ERRADO
export async function listServices() {
  return prisma.service.findMany();  // sem tenant → RLS retorna []
}
```
```ts
// CERTO
export async function listServices(orgId: string) {
  return withTenant(orgId, (db) => db.service.findMany());
}
```
**Por quê:** RLS bloqueia, então no melhor caso retorna vazio (bug silencioso). No pior caso, alguém esquece de habilitar RLS em uma tabela nova e vaza tudo.

### ❌ Server Action sem Zod
```ts
// ERRADO
export async function createService(input: { name: string }) {
  return db.service.create({ data: input });  // confia em input??
}
```
```ts
// CERTO
export async function createService(input: unknown) {
  const data = createServiceSchema.parse(input);
  return db.service.create({ data });
}
```
**Por quê:** TS é apagado. Cliente pode mandar `{ name: 'x'.repeat(10000), priceCents: -1 }`.

### ❌ Mock de DB em integration test
```ts
// ERRADO
vi.mock("@prisma/client", () => ({ ... }));
```
```ts
// CERTO (em integration)
await setupTestDb();  // Postgres real em container
```
**Por quê:** integration test existe pra pegar bugs de SQL/RLS/migration. Mock esconde tudo isso.

### ❌ Hardcode de segredo
```ts
// ERRADO
const RESEND_KEY = "re_abcd1234...";
```
```ts
// CERTO
const RESEND_KEY = process.env.RESEND_API_KEY;
if (!RESEND_KEY) throw new Error("RESEND_API_KEY ausente");
```

## 🔧 Anti-patterns de código

### ❌ `any`
```ts
// ERRADO
function process(data: any) { ... }
```
```ts
// CERTO
function process(data: unknown) {
  if (typeof data === "object" && data !== null && "id" in data) {
    // narrowed
  }
}
// OU
function process(data: KnownType) { ... }
```

### ❌ `@ts-ignore`
```ts
// ERRADO
// @ts-ignore
foo.bar.baz;
```
```ts
// CERTO
// @ts-expect-error — Foo.bar é opcional aqui pq é mock, ver test #42
foo.bar.baz;
// OU melhor: ajusta o tipo
```

### ❌ Floating promise
```ts
// ERRADO (no-floating-promises)
sendEmail(user.email);
return ok();
```
```ts
// CERTO
await sendEmail(user.email);
return ok();
// OU explícito fire-and-forget:
void sendEmail(user.email).catch(logErr);
```

### ❌ `// @ts-expect-error` sem comentário
```ts
// ERRADO
// @ts-expect-error
foo();
```
```ts
// CERTO
// @ts-expect-error — Next 15 types ainda não cobrem searchParams como Promise
const params = await searchParams;
```

### ❌ Comentário "WHAT" em vez de "WHY"
```ts
// ERRADO
// pega o serviço pelo id
function getService(id) { ... }

// função adicionada para PBI-04
function newFn() { ... }
```
```ts
// CERTO (sem comentário)
function getService(id: string) { ... }

// CERTO (WHY non-obvious)
// Subtrai 1 min porque o EXCLUDE range é '[)' — ver RN-CB-01
const adjusted = subMinutes(end, 1);
```

### ❌ `console.log` em produção
```ts
// ERRADO
console.log("user logged in", user);
```
```ts
// CERTO
import { logger } from "@/lib/logger";
logger.info({ userId: user.id }, "user logged in");
// (PII fora dos logs — pino com redaction)
```

ESLint: `no-console: ["warn", { allow: ["warn", "error"] }]`.

## 🎨 Anti-patterns de UI

### ❌ `<div onClick>` em vez de `<button>`
```tsx
// ERRADO
<div onClick={handle} className="cursor-pointer">Clique</div>
```
```tsx
// CERTO
<button type="button" onClick={handle}>Clique</button>
```
A11y, foco, teclado, tudo de graça.

### ❌ Editar arquivo de `src/components/ui/`
```tsx
// ERRADO — eles vêm do shadcn CLI; vão ser sobrescritos
// src/components/ui/button.tsx → mexer aqui
```
```tsx
// CERTO — wrapper em features/
// src/components/features/admin/AdminButton.tsx
import { Button } from "@/components/ui/button";
export function AdminButton(props) {
  return <Button variant="default" className="..." {...props} />;
}
```

### ❌ Função passada como prop de Server pra Client
```tsx
// ERRADO
// página (server)
const onSave = () => { ... };
return <ClientForm onSave={onSave} />;  // não serializa
```
```tsx
// CERTO — Server Action
// actions.ts
"use server";
export async function saveAction(data) { ... }

// página
return <ClientForm action={saveAction} />;
```

### ❌ `useEffect` pra fetch em vez de Server Component
```tsx
// ERRADO
"use client";
function MyPage() {
  const [data, setData] = useState([]);
  useEffect(() => { fetch(...).then(...) }, []);
}
```
```tsx
// CERTO
// page.tsx (Server Component)
export default async function MyPage() {
  const data = await loadData();
  return <List items={data} />;
}
```

### ❌ Tailwind arbitrário pra cor quando já tem var
```tsx
// ERRADO
<div className="bg-[#7c3aed]">...</div>
```
```tsx
// CERTO (usa var → tema funciona)
<div className="bg-primary">...</div>
```

## 🕐 Anti-patterns de datas

### ❌ Aritmética de data com string
```ts
// ERRADO
if (`${y}-${m}-${d}` < `${y2}-${m2}-${d2}`) { ... }
```
```ts
// CERTO
import { isBefore } from "date-fns";
if (isBefore(d1, d2)) { ... }
```

### ❌ `new Date(string)` sem fuso explícito
```ts
// ERRADO
const d = new Date("2026-06-01 09:00");  // browser/server diferem
```
```ts
// CERTO
import { zonedTimeToUtc } from "date-fns-tz";
const d = zonedTimeToUtc("2026-06-01 09:00", "America/Sao_Paulo");
```

### ❌ `Date.now()` em função "pura"
```ts
// ERRADO — não dá pra testar determinístico
function isPast(d: Date) { return d < new Date(); }
```
```ts
// CERTO
function isPast(d: Date, now = new Date()) { return d < now; }
```

## 📦 Anti-patterns de workflow

### ❌ PR mega
- 1 PR com 800+ linhas mexendo em 12 arquivos diferentes.
- Reviewer não consegue revisar bem; bugs passam.

→ **Quebra em PRs menores.** Se a PBI é grande demais, quebra a PBI.

### ❌ Refactor "de quebra"
```
PR title: "fix: corrige cálculo de slot quando bloqueio é à noite"
PR diff: 600 linhas, renomeia 4 funções, move 3 arquivos, mexe em CSS
```

→ **Bug fix = só o fix.** Refactor em PR separada.

### ❌ `--no-verify` em commit
```bash
git commit --no-verify -m "WIP"
```
Hooks existem por motivo. Se está falhando, conserta a causa.

### ❌ Force push em `main`
```bash
git push --force origin main
```
**Nunca.** Mesmo que tenha autoridade. Especialmente se tem autoridade.

### ❌ Commit sem PBI relacionada
```
fix: tweaks
```
Mensagem útil = `<tipo>(<escopo>): <descrição>` + link/menção da PBI.

## 🤖 Anti-patterns específicos de agente

### ❌ "Vou criar essa abstração porque pode ser útil"
PBI pede 3 linhas; agente cria 5 arquivos, 1 helper, 1 hook custom, 1 type novo. **Pare.** Faz o mínimo.

### ❌ "Vou adicionar essa validação extra por segurança"
Se a PBI não pede e a RN não exige, não adiciona. Menciona como observação.

### ❌ "Vou consertar esse bug que vi de quebra"
Cria issue/menciona, **não** conserta na PR atual. Escopo único.

### ❌ "Vou rodar `db:migrate deploy` pra ver se funciona"
Em prod? Nunca. Em dev local? Veja se a PBI pede.

### ❌ Continua mesmo sem ter certeza
Se você está adivinhando uma regra de negócio, uma decisão arquitetural, ou uma mudança de fluxo — **pare e pergunte**. [Lista completa em principios.md §Quando parar](principios.md#-quando-parar-e-perguntar).

---

## 🧪 Auto-check antes de abrir PR

- [ ] Sem `any` no diff?
- [ ] Sem `@ts-ignore`?
- [ ] Sem `console.log`?
- [ ] Toda Server Action começa com `schema.parse`?
- [ ] Toda query usa `withTenant`?
- [ ] `pnpm typecheck && pnpm lint && pnpm test:run` verde?
- [ ] PR < 300 linhas? (se não, justifica)
- [ ] Comentários só onde WHY é não-óbvio?
- [ ] Sem refactor "de quebra"?
- [ ] PBI linkada no PR body?

Se algum bater "não", recue antes de pedir review.
