import { z } from "zod";

/**
 * Validação de produto (PBI-18 fase 1).
 * Preço/custo em centavos pra evitar float; quantidades em inteiros.
 */

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo (máx 80)"),
  sku: z
    .string()
    .trim()
    .max(40, "SKU muito longo (máx 40)")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Descrição muito longa (máx 500)")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  salePriceCents: z
    .number()
    .int()
    .min(0, "Preço não pode ser negativo")
    .max(10_000_000, "Preço alto demais"),
  costPriceCents: z
    .number()
    .int()
    .min(0, "Custo não pode ser negativo")
    .max(10_000_000, "Custo alto demais")
    .default(0),
  minStock: z
    .number()
    .int()
    .min(0, "Estoque mínimo não pode ser negativo")
    .max(100_000)
    .default(0),
  active: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Converte FormData (centavos vêm como string em "real") em input. */
export function productFormDataToInput(formData: FormData): unknown {
  const salePrice = parseReal(formData.get("salePrice"));
  const costPrice = parseReal(formData.get("costPrice"));
  const minStock = parseInt(String(formData.get("minStock") ?? "0"), 10);
  return {
    name: formData.get("name"),
    sku: formData.get("sku") ?? "",
    description: formData.get("description") ?? "",
    salePriceCents: salePrice,
    costPriceCents: costPrice,
    minStock: Number.isNaN(minStock) ? 0 : minStock,
    active:
      formData.get("active") === "on" || formData.get("active") === "true",
  };
}

function parseReal(v: FormDataEntryValue | null): number {
  if (v === null) return 0;
  // Aceita "12,50", "12.50", "1234" — devolve centavos
  const cleaned = String(v).replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export const inventoryMovementSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z
    .number()
    .int()
    .min(1, "Quantidade tem que ser positiva")
    .max(1_000_000),
  reason: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
