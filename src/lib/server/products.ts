import "server-only";

import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db";
import type {
  CreateProductInput,
  InventoryMovementInput,
  UpdateProductInput,
} from "@/lib/validators/product";

export type AdminProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  salePriceCents: number;
  costPriceCents: number;
  minStock: number;
  active: boolean;
  currentStock: number;
  stockStatus: "ok" | "low" | "critical" | "negative";
  createdAt: Date;
  updatedAt: Date;
};

export class ProductError extends Error {
  constructor(
    message: string,
    public code: "SKU_TAKEN" | "NOT_FOUND" | "VALIDATION" | "UNKNOWN",
  ) {
    super(message);
    this.name = "ProductError";
  }
}

/**
 * Estoque atual de um produto = soma assinada das movimentações:
 *   IN: +qty, OUT: -qty, ADJUST: +qty (positivo seta delta direto)
 *
 * Calculado em SQL pra evitar N+1 quando listar.
 */
type StockRow = { productId: string; stock: number };

async function computeStocksForOrg(
  db: { $queryRawUnsafe: <T>(sql: string) => Promise<T> },
): Promise<Map<string, number>> {
  const rows = await db.$queryRawUnsafe<StockRow[]>(`
    SELECT
      "productId",
      SUM(
        CASE
          WHEN type = 'IN' THEN quantity
          WHEN type = 'OUT' THEN -quantity
          WHEN type = 'ADJUST' THEN quantity
        END
      )::int AS stock
    FROM "inventory_movements"
    GROUP BY "productId"
  `);
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.productId, r.stock ?? 0);
  return m;
}

function statusFromStock(
  stock: number,
  min: number,
): AdminProduct["stockStatus"] {
  if (stock < 0) return "negative";
  if (min > 0 && stock <= min * 0.5) return "critical";
  if (min > 0 && stock <= min) return "low";
  return "ok";
}

export async function listProducts(
  organizationId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<AdminProduct[]> {
  return withTenant(organizationId, async (db) => {
    const [products, stocks] = await Promise.all([
      db.product.findMany({
        where: opts.activeOnly ? { active: true } : undefined,
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
      computeStocksForOrg(db),
    ]);
    return products.map((p) => {
      const stock = stocks.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        salePriceCents: p.salePriceCents,
        costPriceCents: p.costPriceCents,
        minStock: p.minStock,
        active: p.active,
        currentStock: stock,
        stockStatus: statusFromStock(stock, p.minStock),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  });
}

export async function createProduct(
  organizationId: string,
  input: CreateProductInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    try {
      const p = await db.product.create({
        data: {
          organizationId,
          name: input.name,
          sku: input.sku ?? null,
          description: input.description ?? null,
          salePriceCents: input.salePriceCents,
          costPriceCents: input.costPriceCents,
          minStock: input.minStock,
          active: input.active,
        },
        select: { id: true },
      });
      return p;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ProductError(
          `Já existe produto com SKU "${input.sku ?? ""}".`,
          "SKU_TAKEN",
        );
      }
      throw err;
    }
  });
}

export async function updateProduct(
  organizationId: string,
  input: UpdateProductInput,
): Promise<void> {
  const { id, ...rest } = input;
  return withTenant(organizationId, async (db) => {
    try {
      await db.product.update({
        where: { id },
        data: {
          ...(rest.name !== undefined && { name: rest.name }),
          ...(rest.sku !== undefined && { sku: rest.sku }),
          ...(rest.description !== undefined && {
            description: rest.description,
          }),
          ...(rest.salePriceCents !== undefined && {
            salePriceCents: rest.salePriceCents,
          }),
          ...(rest.costPriceCents !== undefined && {
            costPriceCents: rest.costPriceCents,
          }),
          ...(rest.minStock !== undefined && { minStock: rest.minStock }),
          ...(rest.active !== undefined && { active: rest.active }),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ProductError(`SKU já em uso.`, "SKU_TAKEN");
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw new ProductError("Produto não encontrado.", "NOT_FOUND");
      }
      throw err;
    }
  });
}

export async function createInventoryMovement(
  organizationId: string,
  userId: string | null,
  input: InventoryMovementInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.inventoryMovement.create({
      data: {
        organizationId,
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason ?? null,
        userId: userId ?? null,
      },
      select: { id: true },
    });
  });
}

export async function deactivateProduct(
  organizationId: string,
  productId: string,
): Promise<void> {
  return withTenant(organizationId, async (db) => {
    await db.product.update({
      where: { id: productId },
      data: { active: false },
    });
  });
}
