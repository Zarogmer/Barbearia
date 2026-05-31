import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const openComandaSchema = z.object({
  customerUserId: UUID.optional().or(z.literal("").transform(() => undefined)),
  customerName: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  professionalId: UUID,
  appointmentId: UUID.optional().or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type OpenComandaInput = z.infer<typeof openComandaSchema>;

export const addItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SERVICE"),
    serviceId: UUID,
    quantity: z.coerce.number().int().min(1).default(1),
  }),
  z.object({
    type: z.literal("PRODUCT"),
    productId: UUID,
    quantity: z.coerce.number().int().min(1).default(1),
  }),
  z.object({
    type: z.literal("MANUAL"),
    name: z.string().trim().min(2).max(120),
    unitPriceCents: z.coerce.number().int().min(0).max(10_000_000),
    quantity: z.coerce.number().int().min(1).default(1),
  }),
]);

export type AddItemInput = z.infer<typeof addItemSchema>;

export const addPaymentSchema = z.object({
  method: z.enum(["CASH", "PIX", "CREDIT", "DEBIT", "CORTESIA"]),
  amountCents: z.coerce.number().int().min(0).max(10_000_000),
});

export type AddPaymentInput = z.infer<typeof addPaymentSchema>;

export const applyDiscountSchema = z.object({
  discountCents: z.coerce.number().int().min(0).max(10_000_000),
});

export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;

export function openComandaFormDataToInput(formData: FormData): unknown {
  // formData.get() devolve null pra campo ausente. Zod nao trata null
  // como "vazio" — precisa virar undefined pra cair no .optional().
  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    customerUserId: opt("customerUserId"),
    customerName: opt("customerName"),
    professionalId: opt("professionalId"),
    appointmentId: opt("appointmentId"),
    notes: opt("notes"),
  };
}

export function addItemFormDataToInput(formData: FormData): unknown {
  const type = formData.get("type");
  if (type === "SERVICE") {
    return {
      type: "SERVICE",
      serviceId: formData.get("serviceId"),
      quantity: formData.get("quantity"),
    };
  }
  if (type === "PRODUCT") {
    return {
      type: "PRODUCT",
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
    };
  }
  // MANUAL
  return {
    type: "MANUAL",
    name: formData.get("name"),
    unitPriceCents: Math.round(Number(formData.get("priceReais")) * 100),
    quantity: formData.get("quantity"),
  };
}

export function addPaymentFormDataToInput(formData: FormData): unknown {
  return {
    method: formData.get("method"),
    amountCents: Math.round(Number(formData.get("amountReais")) * 100),
  };
}
