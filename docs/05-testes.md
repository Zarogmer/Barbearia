# 05 — Estratégia de testes

## Princípios

1. **Teste o comportamento, não a implementação.** Reescrita interna não deve quebrar teste.
2. **Pirâmide invertida proibida.** A maioria dos testes é unit/integration; E2E é caro, reservado para fluxos críticos.
3. **DB real em integration, não mock.** Mock de DB esconde bugs de SQL/RLS.
4. **Multi-tenant tem testes próprios.** Vazamento cross-tenant é o pior bug que podemos ter.
5. **CI bloqueia merge sem verde.** Sem `--no-verify`, sem `it.skip` sem issue linkada.

## Pirâmide

```
        ┌───────────┐
        │    E2E    │  ~10 specs — fluxos críticos ponta-a-ponta
        │ Playwright│  (criar agendamento, login, leak cross-tenant)
        └───────────┘
       ┌─────────────┐
       │ Integration │  ~30 testes — services com DB real
       │   Vitest    │  (booking-service, slot-calculator, RLS)
       └─────────────┘
      ┌───────────────┐
      │     Unit      │  ~80% do volume — funções puras, validators, componentes
      │ Vitest + RTL  │
      └───────────────┘
```

## Ferramentas

| Camada | Ferramenta | Por quê |
|---|---|---|
| Unit (lógica) | Vitest | Rápido, ESM nativo, compatível Jest |
| Unit (componente) | Vitest + @testing-library/react + jsdom | Padrão React |
| Integration (server) | Vitest + DB real (Postgres em container) | Vê problemas de RLS, SQL, Prisma |
| E2E | Playwright | Multi-browser, fixtures, traces |
| Mock HTTP externo | MSW (Mock Service Worker) | Resend, Google OAuth |

## Estrutura

```
tests/
├── unit/
│   ├── lib/
│   │   ├── slot-calculator.test.ts       # função pura
│   │   └── validators/
│   │       └── booking.test.ts
│   └── components/
│       ├── ServicePicker.test.tsx
│       └── SlotPicker.test.tsx
│
├── integration/
│   ├── setup.ts                           # spin up DB, run migrations
│   ├── booking-service.test.ts
│   ├── tenant-isolation.test.ts           # RLS coverage
│   └── auth-flow.test.ts
│
└── e2e/
    ├── playwright.config.ts
    ├── fixtures/                          # factories de dados
    │   ├── organization.ts
    │   └── user.ts
    ├── client-booking.spec.ts
    ├── admin-agenda.spec.ts
    └── security/
        ├── cross-tenant-leak.spec.ts      # OBRIGATÓRIO
        └── rate-limit.spec.ts
```

## Cobertura mínima (CI bloqueia se abaixo)

| Tipo | Meta |
|---|---|
| Lines (global) | 70% |
| `src/lib/server/**` | 85% |
| `src/lib/validators/**` | 95% |
| `src/components/features/**` | 60% |

Cobertura **não** é meta — é piso. Não escreva teste para enganar coverage.

## Padrões de teste

### Unit — função pura

```ts
// tests/unit/lib/slot-calculator.test.ts
import { describe, it, expect } from "vitest";
import { calculateAvailableSlots } from "@/lib/server/slot-calculator";

describe("calculateAvailableSlots", () => {
  it("retorna slots de 30min dentro do horário de trabalho", () => {
    const slots = calculateAvailableSlots({
      workingStartMinute: 9 * 60,  // 09:00
      workingEndMinute: 12 * 60,   // 12:00
      durationMinutes: 30,
      existingAppointments: [],
      blocks: [],
      stepMinutes: 30,
    });

    expect(slots).toHaveLength(6); // 09:00, 09:30, ..., 11:30
  });

  it("remove slot que conflita com appointment existente", () => {
    const slots = calculateAvailableSlots({
      workingStartMinute: 9 * 60,
      workingEndMinute: 12 * 60,
      durationMinutes: 30,
      existingAppointments: [
        { startMinute: 10 * 60, endMinute: 10 * 60 + 30 },
      ],
      blocks: [],
      stepMinutes: 30,
    });

    expect(slots).not.toContain(10 * 60);
  });
});
```

### Unit — componente

```tsx
// tests/unit/components/ServicePicker.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ServicePicker } from "@/components/features/booking/ServicePicker";

describe("ServicePicker", () => {
  const services = [
    { id: "1", name: "Corte", durationMinutes: 30, priceCents: 5000 },
    { id: "2", name: "Barba", durationMinutes: 20, priceCents: 3000 },
  ];

  it("renderiza preço formatado em BRL", () => {
    render(<ServicePicker services={services} onSelect={() => {}} />);
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
  });

  it("dispara onSelect ao clicar", async () => {
    const onSelect = vi.fn();
    render(<ServicePicker services={services} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /corte/i }));
    expect(onSelect).toHaveBeenCalledWith(services[0]);
  });
});
```

### Integration — DB real

```ts
// tests/integration/booking-service.test.ts
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createBooking } from "@/lib/server/booking-service";
import { setupTestDb, seedOrganization, clearAppointments } from "./setup";

describe("createBooking (integration)", () => {
  let orgId: string;
  let serviceId: string;
  let professionalId: string;

  beforeAll(async () => {
    await setupTestDb();
    const seed = await seedOrganization();
    orgId = seed.orgId;
    serviceId = seed.serviceId;
    professionalId = seed.professionalId;
  });

  beforeEach(async () => {
    await clearAppointments(orgId);
  });

  it("cria appointment quando slot está livre", async () => {
    const result = await createBooking(orgId, {
      serviceId,
      professionalId,
      startsAt: new Date("2026-06-01T12:00:00Z"),
      customerName: "Bruno",
    });

    expect(result.id).toBeDefined();
    expect(result.endsAt).toEqual(new Date("2026-06-01T12:30:00Z"));
  });

  it("falha se slot conflita com appointment existente", async () => {
    await createBooking(orgId, {
      serviceId,
      professionalId,
      startsAt: new Date("2026-06-01T12:00:00Z"),
      customerName: "Bruno",
    });

    await expect(
      createBooking(orgId, {
        serviceId,
        professionalId,
        startsAt: new Date("2026-06-01T12:15:00Z"),
        customerName: "Carla",
      })
    ).rejects.toThrow(/conflito/i);
  });
});
```

### Integration — RLS (obrigatório)

```ts
// tests/integration/tenant-isolation.test.ts
import { describe, it, expect } from "vitest";
import { withTenant } from "@/lib/db";
import { seedTwoOrganizations } from "./setup";

describe("RLS — tenant isolation", () => {
  it("query da org A não vê dados da org B", async () => {
    const { orgA, orgB } = await seedTwoOrganizations();

    const visiblesFromA = await withTenant(orgA.id, async (db) => {
      return db.appointment.findMany();
    });

    // Todos os appointments visíveis devem pertencer à orgA
    expect(visiblesFromA.every((a) => a.organizationId === orgA.id)).toBe(true);
    expect(visiblesFromA.some((a) => a.organizationId === orgB.id)).toBe(false);
  });

  it("insert em outra org é rejeitado pelo WITH CHECK", async () => {
    const { orgA, orgB } = await seedTwoOrganizations();

    await expect(
      withTenant(orgA.id, async (db) => {
        return db.service.create({
          data: {
            organizationId: orgB.id, // tentando burlar
            name: "Hack",
            durationMinutes: 30,
            priceCents: 1000,
          },
        });
      })
    ).rejects.toThrow();
  });

  it("sem SET app.current_org_id, query retorna vazio (não erro)", async () => {
    // simula código com bug que esquece de chamar withTenant
    const services = await prismaRaw.service.findMany();
    expect(services).toEqual([]);
  });
});
```

### E2E — fluxo crítico

```ts
// tests/e2e/client-booking.spec.ts
import { test, expect } from "@playwright/test";

test("cliente agenda corte com sucesso", async ({ page }) => {
  await page.goto("/barbearia-demo");
  await page.getByRole("button", { name: /agendar agora/i }).click();

  // passo 1: serviço
  await page.getByRole("button", { name: /^corte/i }).click();

  // passo 2: profissional
  await page.getByRole("button", { name: /joão/i }).click();

  // passo 3: horário
  await page.getByRole("button", { name: /09:00/i }).first().click();

  // passo 4: confirmar
  await page.getByLabel(/nome/i).fill("Bruno Teste");
  await page.getByLabel(/telefone/i).fill("+5511999998888");
  await page.getByRole("button", { name: /confirmar/i }).click();

  await expect(page.getByText(/agendamento confirmado/i)).toBeVisible();
});
```

### E2E — segurança (obrigatório)

```ts
// tests/e2e/security/cross-tenant-leak.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/user";

test("admin de orgA não enxerga appointments de orgB", async ({ page }) => {
  await loginAs(page, "owner@orgA.com");

  await page.goto("/admin/agenda");
  const content = await page.content();

  expect(content).not.toContain("orgB-customer-name");
});

test("acessar URL direta de recurso de outra org retorna 404", async ({ page }) => {
  await loginAs(page, "owner@orgA.com");
  const orgBAppointmentId = "uuid-da-orgB";

  const resp = await page.goto(`/admin/agendamentos/${orgBAppointmentId}`);
  expect(resp?.status()).toBe(404);
});
```

## Factories

`tests/e2e/fixtures/` e `tests/integration/setup.ts` exportam factories estilo Test Data Builder:

```ts
export async function createOrganization(overrides?: Partial<Organization>) {
  return prisma.organization.create({
    data: {
      slug: `org-${nanoid(8)}`,
      name: "Test Org",
      ...overrides,
    },
  });
}

export async function createUser(overrides?: Partial<User>) { /* ... */ }
export async function createAppointment(orgId: string, overrides?: Partial<Appointment>) { /* ... */ }
```

Sem fixtures globais "mágicas" — cada teste pede o que precisa, fica explícito.

## DB de teste

- `pnpm test:integration` sobe Postgres via `docker compose -f docker-compose.test.yml up -d`.
- Migrações aplicadas em `setup.ts` antes da suite.
- Cada arquivo de teste usa truncate por convenção (não drop+create, mais rápido).

## CI gates

Pipeline (GitHub Actions, configurado em D6):

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck` — falha bloqueia
3. `pnpm lint` — falha bloqueia
4. `pnpm test:run --coverage` — falha ou coverage abaixo do mínimo bloqueia
5. `pnpm test:integration` — DB em container, falha bloqueia
6. `pnpm test:e2e` — só na PR para `main`; falha bloqueia

Smoke teste obrigatório em todo merge: `tests/e2e/security/cross-tenant-leak.spec.ts`.

## O que NÃO testar

- Implementação de bibliotecas (Prisma, NextAuth, Zod). Confiar.
- Detalhes visuais (cor, padding). Visual regression é v2 (Percy/Chromatic).
- Fluxos não suportados ("se o usuário fizer F12 e mudar HTML"). Defesa é validação server-side, não teste.
- Mocks de mocks. Se precisa, refatore.
