# 🤖 Patterns do projeto

> Copy-paste-friendly. Cada pattern aqui é como o projeto faz uma coisa específica. Se você se vê fazendo diferente, **provavelmente está errado** — re-verifique antes.

## 🔐 Pattern: `withTenant` em toda query

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function withTenant<T>(
  organizationId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_org_id = '${organizationId}'`
    );
    return fn(tx as PrismaClient);
  });
}
```

**Uso:**

```ts
import { withTenant } from "@/lib/db";

export async function listServices(orgId: string) {
  return withTenant(orgId, async (db) => {
    return db.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  });
}
```

**Atenção:** o `$executeRawUnsafe` aqui é seguro porque `organizationId` é validado como UUID antes (Zod). Pra qualquer outro caso, use `$executeRaw` com template tag.

## 🛡️ Pattern: Server Action canônica

```ts
// src/app/admin/servicos/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { createServiceSchema } from "@/lib/validators/service";

export async function createServiceAction(input: unknown) {
  // 1. Auth + derive orgId
  const session = await auth();
  if (!session) throw new Error("Não autenticado");

  const membership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!membership) throw new Error("Sem permissão");

  // 2. Zod parse — sempre
  const data = createServiceSchema.parse(input);

  // 3. Lógica dentro de withTenant
  const service = await withTenant(membership.organizationId, async (db) => {
    return db.service.create({
      data: {
        ...data,
        organizationId: membership.organizationId,
        professionalServices: {
          create: data.professionalIds.map((id) => ({ professionalId: id })),
        },
      },
    });
  });

  // 4. Revalida cache
  revalidatePath("/admin/servicos");

  return { id: service.id };
}
```

**4 obrigações fixas, nessa ordem:** Auth → Zod → withTenant → revalidate.

## 🏷️ Pattern: Zod schema reusado

```ts
// src/lib/validators/service.ts
import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(240)
    .refine((n) => n % 5 === 0, "Duração deve ser múltipla de 5"),
  priceCents: z.number().int().min(0).max(100_000),
  active: z.boolean().default(true),
  professionalIds: z.array(z.string().uuid()).min(1),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
```

**Reuso:**
- Server Action: `createServiceSchema.parse(formData)`
- Form: `useForm({ resolver: zodResolver(createServiceSchema) })`
- Tipo TS: `CreateServiceInput`

## 🕐 Pattern: Datas — minutos locais ↔ UTC

```ts
// src/lib/server/slot-calculator.ts (pura, sem I/O)
import { zonedTimeToUtc } from "date-fns-tz";

export function calculateAvailableSlots(args: {
  workingHours: WorkingHours[];
  existingAppointments: Appointment[];
  blocks: TimeBlock[];
  durationMinutes: number;
  date: string;               // 'YYYY-MM-DD' local
  timezone: string;           // 'America/Sao_Paulo'
  minAdvanceMinutes: number;
  now?: Date;                 // injetável p/ testes
  step?: number;              // 15 default
}): Array<{ startMinute: number; startUtc: Date }> {
  const { date, timezone, durationMinutes, step = 15, now = new Date() } = args;
  const result = [];

  for (const window of args.workingHours) {
    for (let m = window.startMinute; m + durationMinutes <= window.endMinute; m += step) {
      const localStr = `${date}T${minutesToHHMM(m)}:00`;
      const startUtc = zonedTimeToUtc(localStr, timezone);

      if (startUtc < new Date(now.getTime() + args.minAdvanceMinutes * 60_000)) continue;
      if (conflictsWith(args.existingAppointments, startUtc, durationMinutes)) continue;
      if (conflictsWith(args.blocks, startUtc, durationMinutes)) continue;

      result.push({ startMinute: m, startUtc });
    }
  }
  return result;
}
```

**Regras:**
- Função PURA: `now` injetável, sem `Date.now()` escondido, sem fetch.
- Trabalha em **minutos locais** internamente.
- Converte pra **UTC só na saída** (`startUtc`).
- Nunca compara/soma datas via string.

## 💰 Pattern: Formatação de preço

```ts
// src/lib/utils.ts
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// uso
formatBRL(5000)   // "R$ 50,00"
formatBRL(15000)  // "R$ 150,00"
```

**Regra:** preço **sempre** em `priceCents` (integer). Float pra dinheiro é bug.

## 🧭 Pattern: State entre passos via URL

Em qualquer fluxo multi-step (booking, wizards, etc.):

```tsx
// src/app/(public)/[orgSlug]/agendar/profissional/page.tsx
type Props = { searchParams: { serviceId?: string } };

export default async function Page({ searchParams }: Props) {
  const { serviceId } = searchParams;
  if (!serviceId) redirect(`/${slug}/agendar`);

  const pros = await getProfessionalsForService(orgId, serviceId);
  return <ProfessionalPicker pros={pros} serviceId={serviceId} />;
}
```

**Nunca usar:** `useState` global, `localStorage`, cookie, `Context` pra estado de fluxo. URL search params são URL-shareable, recarregam bem, debugáveis.

## ↔️ Pattern: Resolver orgId em rota pública

```ts
// src/lib/server/orgs.ts
import "server-only";
import { unstable_cache } from "next/cache";

export const getOrgBySlug = unstable_cache(
  async (slug: string) => {
    return prisma.organization.findUnique({ where: { slug } });
  },
  ["org-by-slug"],
  { revalidate: 60 }
);
```

**Por quê cache:** slug é estável; lookup roda em toda página `/[orgSlug]/*`.

## 🔄 Pattern: Captura de race condition no INSERT

```ts
try {
  return await db.appointment.create({ data: { ... } });
} catch (err) {
  // EXCLUDE constraint do Postgres → race detectada
  if (err.code === "P2002" || /23P01|exclusion_violation/.test(err.message)) {
    throw new Error("SLOT_UNAVAILABLE");
  }
  throw err;
}
```

UI captura `SLOT_UNAVAILABLE` e mostra "esse horário acabou de ser pego — escolha outro".

## 🧪 Pattern: Teste integration com tenant real

```ts
// tests/integration/services.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createService } from "@/lib/server/services";
import { setupTestDb, createTestOrg } from "./setup";

describe("createService", () => {
  let orgId: string;
  beforeAll(async () => {
    await setupTestDb();
    orgId = (await createTestOrg("test-org")).id;
  });

  it("cria serviço com organizationId correto", async () => {
    const s = await createService(orgId, {
      name: "Corte",
      durationMinutes: 30,
      priceCents: 5000,
      active: true,
      professionalIds: [],
    });
    expect(s.organizationId).toBe(orgId);
  });
});
```

**Atenção:** integration test **usa DB real**, não mock. Setup roda migrations em DB de teste antes.

## 🎨 Pattern: Componente Server por padrão, Client só quando precisa

```tsx
// src/app/admin/servicos/page.tsx  (Server Component)
import { auth } from "@/lib/auth";
import { listServices } from "@/lib/server/services";
import { ServicesTable } from "@/components/features/admin/ServicesTable";
import { NewServiceButton } from "@/components/features/admin/NewServiceButton";

export default async function ServicesPage() {
  const session = await auth();
  const orgId = session!.user.memberships[0].organizationId;
  const services = await listServices(orgId);

  return (
    <div>
      <NewServiceButton />          {/* Client — abre Dialog com form */}
      <ServicesTable items={services} />  {/* Server — só renderiza */}
    </div>
  );
}
```

```tsx
// src/components/features/admin/NewServiceButton.tsx  (Client)
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ServiceForm } from "./ServiceForm";

export function NewServiceButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button>+ Novo serviço</button>
      </DialogTrigger>
      <DialogContent>
        <ServiceForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```

## 🎯 Pattern: Imports ordenados

```ts
// 1. React / built-in
import { useState } from "react";

// 2. Next
import { redirect } from "next/navigation";

// 3. Terceiros
import { z } from "zod";

// 4. Internos @/
import { Button } from "@/components/ui/button";
import { createBooking } from "@/lib/server/booking-service";

// 5. Relativos
import { formatDate } from "./helpers";

// 6. Tipos — sempre no fim, prefixo `import type`
import type { Service } from "@/types/domain";
```

ESLint `import/order` força isso. PR vermelho se desordenado.
