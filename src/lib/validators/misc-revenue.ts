import { z } from "zod";

const UUID = z.string().uuid("ID inválido");
const DATE = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");

export const miscRevenueSchema = z.object({
  id: UUID.optional(),
  name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  amountCents: z.coerce
    .number()
    .int()
    .min(1, "Valor inválido")
    .max(100_000_000, "Valor alto demais"),
  occurredAt: DATE,
  paymentMethod: z
    .enum(["CASH", "PIX", "CREDIT", "DEBIT", "CORTESIA"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type MiscRevenueInput = z.infer<typeof miscRevenueSchema>;

export function miscRevenueFormDataToInput(formData: FormData): unknown {
  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const amountReais = Number(opt("amountReais") ?? "0");
  return {
    id: opt("id"),
    name: opt("name") ?? "",
    amountCents: Math.round(amountReais * 100),
    occurredAt: opt("occurredAt") ?? "",
    paymentMethod: opt("paymentMethod"),
    notes: opt("notes"),
  };
}
