# ⚡ Patterns de performance

> Como o projeto otimiza UI sem cair em premature optimization. Cada bloco abaixo é uma decisão tomada — siga ou desvie justificando no PR.

> **Regra de ouro:** medir antes. React DevTools Profiler ou `console.time` na função suspeita. Otimização sem evidência só adiciona complexidade.

---

## 🧭 1. Server Component por padrão, Client só quando precisa

### Quando usar Server Component (sem `"use client"`)
- Lê do banco / chama auth() / acessa cookies
- Renderiza dado estático ou que vem do server
- Faz Promise.all de queries pra paralelizar carga

### Quando usar `"use client"`
- Usa `useState`, `useEffect`, `useTransition`, `useActionState`
- Eventos do navegador (`onClick`, `onChange`, `onSubmit`)
- APIs browser (`localStorage`, `Intl`, `navigator`)
- Componentes shadcn que dependem de Radix (Dialog, Switch, Calendar)

### Padrão: server passa dado já mastigado pro client
```tsx
// ❌ Anti-pattern: client component busca dado
"use client";
export function ServicesList() {
  const [services, setServices] = useState([]);
  useEffect(() => { fetch('/api/services').then(r => r.json()).then(setServices); }, []);
  // ...
}

// ✅ Pattern: server busca, client só renderiza interativo
// page.tsx (Server Component)
export default async function Page() {
  const services = await listServices(orgId);  // server query
  return <ServicesTable services={services} />; // passa pronto
}

// ServicesTable.tsx ("use client" só se precisar de filtro/sort interativo)
```

---

## 🧮 2. `useMemo` / `useCallback` — quando NÃO usar

**Default: não use.** React 19 + compilador no horizonte deixam isso obsoleto pra maioria dos casos. Use APENAS quando:

### useMemo
- Cálculo > 1ms numa lista grande (>500 items)
- Objeto/array passado pra child memoizada (`React.memo`)
- Dependência de `useEffect` que muda toda render

```tsx
// ✅ Faz sentido — agregação pesada em N comandas
const totals = useMemo(
  () => comandas.reduce((acc, c) => acc + computeTotal(c), 0),
  [comandas],
);

// ❌ Desnecessário — soma trivial, otimizar isso é ruído
const total = useMemo(() => price * quantity, [price, quantity]);
```

### useCallback
- Função passada pra child memoizada (`React.memo`)
- Função usada como dep de `useEffect`
- Função em lista grande renderizada por children

```tsx
// ✅ Faz sentido — função estável pra Row memoizado
const handleEdit = useCallback((id: string) => setEditing(id), []);
// Row é React.memo, sem useCallback re-renderiza N rows toda vez

// ❌ Desnecessário — callback inline em handler de botão único
<button onClick={() => setOpen(true)}>Abrir</button>
```

---

## 🔄 3. `useTransition` pra updates não-bloqueantes

Use em **Server Actions disparadas por click** pra UI não congelar:

```tsx
"use client";
import { useTransition } from "react";

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await deleteAction(id);  // Server Action
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? "Removendo…" : "Remover"}
    </button>
  );
}
```

**Não use** em form submit — `useFormStatus` + `useActionState` já cuidam disso.

---

## 🎁 4. Providers (Context) — quando vale e quando não

### Vale
- Tema dark/light (PBI-28 `ThemeSelector` aplica sem prop drilling)
- Auth session (NextAuth providencia `SessionProvider` já)
- Toaster global (1 instância no layout, qualquer componente dispara)

### NÃO vale
- Dados de uma página específica → passa por props ou Server Component
- Estado de formulário → `useActionState` local
- Filtros de URL → `useSearchParams` + Server Component

### Padrão: Provider SLIM no layout
```tsx
// src/app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
```

**1 provider component** que agrupa todos. Não polui `layout.tsx`.

---

## 🖼️ 5. `next/image` sempre

```tsx
// ❌ Anti-pattern
<img src={url} alt="Foto" />

// ✅ Pattern
import Image from "next/image";
<Image src={url} alt="Foto" width={200} height={200} className="object-cover" />
```

Vantagens: lazy-load automático, srcset responsivo, AVIF/WebP, blur placeholder. Hosts externos exigem `remotePatterns` em `next.config.ts` (já configurado pra `**`).

**Exceção:** quando URL pode falhar ou é placeholder, `<img>` com `onError` (ex: NewPostDialog preview).

---

## ⚡ 6. Paralelizar queries com `Promise.all`

Server Components esperam queries em série por default. Sempre que duas queries são independentes:

```tsx
// ❌ Sequencial — soma latência
const services = await listServices(orgId);
const professionals = await listProfessionals(orgId);  // só roda quando services chega

// ✅ Paralelo — só a maior das duas
const [services, professionals] = await Promise.all([
  listServices(orgId),
  listProfessionals(orgId),
]);
```

Padrão em todo `page.tsx` do `/admin/*` que precisa de >1 dado.

---

## 🔒 7. Cache com `unstable_cache` em queries quentes

Landing pública, vitrine, dashboard — leitura repetida do mesmo dado. Cache por tag invalida quando ação relevante muda.

```tsx
import { unstable_cache } from "next/cache";

export const getOrgPublicProfile = unstable_cache(
  async (slug: string) => { /* ... */ },
  ["org-public-profile-v2"],  // key array — bump versão se schema mudar
  { revalidate: 60, tags: ["org-public-profile"] },
);

// Ação que muda dado:
import { revalidateTag } from "next/cache";
export async function updateOrgAction() {
  await updateOrg(...);
  revalidateTag("org-public-profile");
}
```

**NÃO cache:**
- Query que depende de session (cada user vê diferente)
- Mutação (obvio)
- Dado que muda toda hora (preço, estoque)

---

## 📦 8. Code-splitting — lazy load de componentes pesados

Dialog/Modal raramente aberto = não envia o JS no bundle inicial:

```tsx
// ❌ Anti-pattern — toda página /admin/comandas baixa Dialog
import { OpenComandaDialog } from "@/components/features/admin/OpenComandaDialog";

// ✅ Pattern — só baixa quando admin clica em "Nova"
import dynamic from "next/dynamic";
const OpenComandaDialog = dynamic(
  () => import("@/components/features/admin/OpenComandaDialog").then(m => m.OpenComandaDialog),
  { ssr: false }
);
```

**Use em:** dialogs, charts, editores ricos, mapas. **Não use em:** componentes acima do fold ou usados em >50% das visitas.

---

## ⏱️ 9. `Suspense` boundaries por seção

Cada seção carrega independente — usuário vê o que tá pronto:

```tsx
// page.tsx
export default function Dashboard() {
  return (
    <>
      <KpiCards />  {/* server component, rápido */}
      <Suspense fallback={<TableSkeleton />}>
        <UpcomingAppointments />  {/* query lenta */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentReviews />  {/* outra query lenta */}
      </Suspense>
    </>
  );
}
```

Sem Suspense, toda a página espera a query mais lenta.

---

## 🚦 10. Server Actions com Zod parse + revalidate

Padrão único pra TODA Server Action:

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const inputSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function createServiceAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  // 1. Auth gate
  const session = await auth();
  if (!session?.user) return { error: "Sem sessão" };
  const orgId = session.user.memberships[0]?.organizationId;
  if (!orgId) return { error: "Sem org" };

  // 2. Zod parse (NUNCA confie em TS no runtime)
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Inválido", fieldErrors: collectErrors(parsed.error) };
  }

  // 3. Service layer (faz withTenant)
  try {
    await createService(orgId, parsed.data);
  } catch (e) {
    return { error: "Falha" };
  }

  // 4. Revalidate + return
  revalidatePath("/admin/servicos");
  return { ok: true };
}
```

Toda action: **auth → parse → service → revalidate → state**.

---

## 📊 11. Lista densa: virtualizar só acima de 200 items

`react-window` ou `@tanstack/react-virtual` — só quando lista realmente é grande.

```tsx
// até 200 items: render direto
{items.map(i => <Row key={i.id} {...i} />)}

// 500+: virtualiza
import { useVirtualizer } from "@tanstack/react-virtual";
// ...
```

Comandas/serviços/profissionais hoje raramente passam de 50 → renderiza direto.

---

## 🎯 12. Bundle: monitorar `pnpm build`

Toda PR que adiciona feature: olhar output de `pnpm build`:
```
Route (app)                              Size  First Load JS
├ ƒ /admin/servicos                  5.76 kB         130 kB
```

- **Size**: o que essa rota adiciona
- **First Load JS**: bundle total no primeiro carregamento

Se uma rota passar de 200kB First Load → investigar. Geralmente é dep nova grande importada estática (charts, PDF lib).

---

## Checklist PR de performance

Quando entregar feature nova, garantir:

- [ ] Server Component por padrão; `"use client"` justificado
- [ ] `Promise.all` em queries paralelas
- [ ] Sem `useMemo`/`useCallback` premature (medi antes?)
- [ ] `next/image` em todas imagens estáticas + externas
- [ ] `useTransition` em Server Actions disparadas por click
- [ ] `unstable_cache` em query quente cross-request
- [ ] Dialog/Modal raro → `dynamic()` lazy
- [ ] Build size não regrediu mais que 5kB sem motivo

---

## Anti-patterns explícitos

- ❌ `useEffect` pra buscar dado (use Server Component)
- ❌ `'use client'` no topo de tudo "por garantia"
- ❌ `useMemo` em valor primitivo (`useMemo(() => price * 2, [price])`)
- ❌ `useCallback` em callback inline de botão único
- ❌ Provider global de dado específico de página
- ❌ `<img>` com URL externa sem `width/height` (CLS)
- ❌ Query em série quando paralela serve
- ❌ Sem revalidate em Server Action que muda dado
