/**
 * PBI-11 — Tenant Isolation Tests
 *
 * Bug mais crítico do SaaS = vazar dados entre tenants. Esses testes
 * **explicitamente** tentam acessar/modificar dados de outra org pra
 * confirmar que RLS + withTenant barram.
 *
 * Requer Postgres com RLS habilitado (migration 00000_rls_setup) +
 * setup-app-user.ts rodado pra criar role `app_user`. Em CI/CD esse
 * setup é parte do job `test:integration`.
 *
 * Pré-requisito local:
 *   pnpm test:db:up && pnpm test:db:setup
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  adminPrisma,
  cleanupTestData,
  createTestOrg,
  withTenantCtx,
  type TestOrgFixture,
} from "./setup";

describe("Tenant Isolation (RLS + withTenant)", () => {
  let orgA: TestOrgFixture;
  let orgB: TestOrgFixture;

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();
    orgA = await createTestOrg("orga");
    orgB = await createTestOrg("orgb");
  });

  afterAll(async () => {
    await cleanupTestData();
    await adminPrisma.$disconnect();
  });

  it("query de org A dentro de withTenantCtx(orgA) NÃO retorna serviços de org B", async () => {
    const servicesVisibleToA = await withTenantCtx(orgA.org.id, async (db) => {
      return db.service.findMany({ select: { id: true, organizationId: true } });
    });

    // Deve ver apenas o próprio serviço
    expect(servicesVisibleToA).toHaveLength(1);
    expect(servicesVisibleToA[0]!.organizationId).toBe(orgA.org.id);
    expect(servicesVisibleToA.find((s) => s.id === orgB.service.id)).toBeUndefined();
  });

  it("query de org A NÃO retorna professionals de org B", async () => {
    const profsVisibleToA = await withTenantCtx(orgA.org.id, async (db) => {
      return db.professional.findMany({
        select: { id: true, organizationId: true },
      });
    });

    expect(profsVisibleToA).toHaveLength(1);
    expect(profsVisibleToA[0]!.organizationId).toBe(orgA.org.id);
    expect(profsVisibleToA.find((p) => p.id === orgB.professional.id)).toBeUndefined();
  });

  it("findUnique direto por ID de serviço de org B (dentro de ctx A) retorna null", async () => {
    const stolenService = await withTenantCtx(orgA.org.id, async (db) => {
      return db.service.findUnique({
        where: { id: orgB.service.id },
        select: { id: true, name: true },
      });
    });

    // RLS faz a row ser "invisível" pro contexto A
    expect(stolenService).toBeNull();
  });

  it("UPDATE de professional de org B (dentro de ctx A) afeta 0 rows", async () => {
    const result = await withTenantCtx(orgA.org.id, async (db) => {
      return db.professional.updateMany({
        where: { id: orgB.professional.id },
        data: { name: "HACKED" },
      });
    });

    expect(result.count).toBe(0);

    // Confirma com admin que o nome não mudou
    const profB = await adminPrisma.professional.findUnique({
      where: { id: orgB.professional.id },
      select: { name: true },
    });
    expect(profB?.name).toBe(orgB.professional.name);
  });

  it("appointment criado dentro de ctx(orgA) tem organizationId = orgA (mesmo passando ID de orgB no payload)", async () => {
    // RLS deve bloquear inserir um appointment com FK pra orgB enquanto
    // o tenant context aponta pra orgA. Se passar, é vazamento crítico.
    const startsAt = new Date("2030-01-01T13:00:00Z");
    const endsAt = new Date("2030-01-01T13:30:00Z");

    await expect(
      withTenantCtx(orgA.org.id, async (db) => {
        return db.appointment.create({
          data: {
            organizationId: orgB.org.id, // ← tentativa de "passar perto"
            professionalId: orgB.professional.id,
            serviceId: orgB.service.id,
            customerName: "Atacante",
            startsAt,
            endsAt,
          },
          select: { id: true },
        });
      }),
    ).rejects.toBeDefined();

    // Confirma que nada foi criado em B
    const apptsInB = await adminPrisma.appointment.count({
      where: { organizationId: orgB.org.id },
    });
    expect(apptsInB).toBe(0);
  });
});
