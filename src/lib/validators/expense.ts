import { z } from "zod";

const UUID = z.string().uuid("ID inválido");
const DATE = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");

export const expenseSchema = z.object({
  id: UUID.optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
  amountCents: z.coerce
    .number()
    .int()
    .min(1, "Valor inválido")
    .max(100_000_000, "Valor alto demais"),
  expenseDate: DATE,
  category: z
    .string()
    .trim()
    .max(60, "Categoria muito longa")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  paid: z.boolean().default(true),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export function expenseFormDataToInput(formData: FormData): unknown {
  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const amountReais = Number(opt("amountReais") ?? "0");
  return {
    id: opt("id"),
    name: opt("name") ?? "",
    amountCents: Math.round(amountReais * 100),
    expenseDate: opt("expenseDate") ?? "",
    category: opt("category"),
    notes: opt("notes"),
    paid: formData.get("paid") === "on" || formData.get("paid") === "true",
  };
}
