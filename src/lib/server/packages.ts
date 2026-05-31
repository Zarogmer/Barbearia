import "server-only";

import { withTenant } from "@/lib/db";

/**
 * Pacotes de sessao pre-pagos (PBI-26).
 *
 * Modelo: dono cadastra Package (10 cortes por R$ 200, expira em 60d).
 * Cliente compra -> cria CustomerPackage com sessionsRemaining=10.
 * Cada appointment COMPLETED desse servico pode consumir 1 sessao
 * (acao manual do admin via dialog na ficha do cliente).
 */

export type AdminPackage = {
  id: string;
  serviceId: string;
  serviceName: string;
  name: string;
  sessionsCount: number;
  priceCents: number;
  pricePerSessionCents: number;
  expiresInDays: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerPackageRow = {
  id: string;
  packageId: string;
  packageName: string;
  serviceId: string;
  serviceName: string;
  sessionsRemaining: number;
  sessionsCount: number;
  purchasedAt: Date;
  expiresAt: Date | null;
  expired: boolean;
};

export type CreatePackageInput = {
  name: string;
  serviceId: string;
  sessionsCount: number;
  priceCents: number;
  expiresInDays?: number | null;
  active?: boolean;
};

export type UpdatePackageInput = CreatePackageInput & { id: string };

export class PackageError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "VALIDATION"
      | "EXPIRED"
      | "EMPTY"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "PackageError";
  }
}

// ──────── CRUD de Package (cardapio) ────────

export async function listPackages(
  organizationId: string,
  opts: { onlyActive?: boolean } = {},
): Promise<AdminPackage[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.package.findMany({
      where: opts.onlyActive ? { active: true } : undefined,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { service: { select: { name: true } } },
    });
    return rows.map((p) => ({
      id: p.id,
      serviceId: p.serviceId,
      serviceName: p.service.name,
      name: p.name,
      sessionsCount: p.sessionsCount,
      priceCents: p.priceCents,
      pricePerSessionCents:
        p.sessionsCount > 0 ? Math.round(p.priceCents / p.sessionsCount) : 0,
      expiresInDays: p.expiresInDays,
      active: p.active,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  });
}

export async function createPackage(
  organizationId: string,
  input: CreatePackageInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.package.create({
      data: {
        organizationId,
        serviceId: input.serviceId,
        name: input.name,
        sessionsCount: input.sessionsCount,
        priceCents: input.priceCents,
        expiresInDays: input.expiresInDays ?? null,
        active: input.active ?? true,
      },
      select: { id: true },
    });
  });
}

export async function updatePackage(
  organizationId: string,
  input: UpdatePackageInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.package.update({
      where: { id: input.id },
      data: {
        serviceId: input.serviceId,
        name: input.name,
        sessionsCount: input.sessionsCount,
        priceCents: input.priceCents,
        expiresInDays: input.expiresInDays ?? null,
        active: input.active ?? true,
      },
    });
  });
}

export async function deletePackage(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    // Trava se ja foi vendido — preserva historico. Use deactivate em vez.
    const sold = await db.customerPackage.count({ where: { packageId: id } });
    if (sold > 0) {
      throw new PackageError(
        "Pacote já vendido — desative em vez de remover.",
        "VALIDATION",
      );
    }
    await db.package.delete({ where: { id } });
  });
}

// ──────── Venda + saldo ────────

/**
 * Vende pacote pra cliente. Calcula expiresAt baseado no expiresInDays
 * do template. Idempotente NAO — cada chamada cria nova venda.
 */
export async function purchasePackage(
  organizationId: string,
  packageId: string,
  customerUserId: string,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    const pkg = await db.package.findUniqueOrThrow({
      where: { id: packageId },
      select: { sessionsCount: true, expiresInDays: true, active: true },
    });
    if (!pkg.active) {
      throw new PackageError("Pacote inativo.", "VALIDATION");
    }
    const purchasedAt = new Date();
    const expiresAt = pkg.expiresInDays
      ? new Date(purchasedAt.getTime() + pkg.expiresInDays * 86_400_000)
      : null;
    return db.customerPackage.create({
      data: {
        organizationId,
        packageId,
        customerUserId,
        sessionsRemaining: pkg.sessionsCount,
        purchasedAt,
        expiresAt,
      },
      select: { id: true },
    });
  });
}

export async function listCustomerPackages(
  organizationId: string,
  customerUserId: string,
  opts: { onlyActive?: boolean } = {},
): Promise<CustomerPackageRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.customerPackage.findMany({
      where: { customerUserId },
      orderBy: { purchasedAt: "desc" },
      include: {
        package: {
          select: {
            name: true,
            sessionsCount: true,
            serviceId: true,
            service: { select: { name: true } },
          },
        },
      },
    });
    const now = new Date();
    const mapped: CustomerPackageRow[] = rows.map((r) => ({
      id: r.id,
      packageId: r.packageId,
      packageName: r.package.name,
      serviceId: r.package.serviceId,
      serviceName: r.package.service.name,
      sessionsRemaining: r.sessionsRemaining,
      sessionsCount: r.package.sessionsCount,
      purchasedAt: r.purchasedAt,
      expiresAt: r.expiresAt,
      expired: !!(r.expiresAt && r.expiresAt < now),
    }));
    if (opts.onlyActive) {
      return mapped.filter((p) => p.sessionsRemaining > 0 && !p.expired);
    }
    return mapped;
  });
}

/**
 * Consome 1 sessao de um saldo. Decrementa sessionsRemaining se >0 e
 * nao expirado. Caller decide qual saldo consumir (geralmente o mais
 * antigo nao-expirado).
 */
export async function consumeSession(
  organizationId: string,
  customerPackageId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    const cp = await db.customerPackage.findUniqueOrThrow({
      where: { id: customerPackageId },
      select: { sessionsRemaining: true, expiresAt: true },
    });
    if (cp.expiresAt && cp.expiresAt < new Date()) {
      throw new PackageError("Pacote expirado.", "EXPIRED");
    }
    if (cp.sessionsRemaining <= 0) {
      throw new PackageError("Sem sessões restantes.", "EMPTY");
    }
    await db.customerPackage.update({
      where: { id: customerPackageId },
      data: { sessionsRemaining: { decrement: 1 } },
    });
  });
}

/**
 * Estorna +1 sessao (caso de cancel de appointment que consumiu).
 * Caller deve garantir que era esse o pacote consumido.
 */
export async function refundSession(
  organizationId: string,
  customerPackageId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    const cp = await db.customerPackage.findUniqueOrThrow({
      where: { id: customerPackageId },
      select: { sessionsRemaining: true, package: { select: { sessionsCount: true } } },
    });
    if (cp.sessionsRemaining >= cp.package.sessionsCount) {
      // Ja no maximo — nada a estornar (provavel cancel duplicado)
      return;
    }
    await db.customerPackage.update({
      where: { id: customerPackageId },
      data: { sessionsRemaining: { increment: 1 } },
    });
  });
}
