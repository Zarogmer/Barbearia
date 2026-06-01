import { z } from "zod";

const UUID = z.string().uuid("ID inválido");
const DATE = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");

export const waitlistSchema = z
  .object({
    customerUserId: UUID.optional().or(z.literal("").transform(() => undefined)),
    customerName: z
      .string()
      .trim()
      .min(2, "Nome muito curto")
      .max(80, "Nome muito longo"),
    customerPhone: z
      .string()
      .trim()
      .max(20, "Telefone muito longo")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    serviceId: UUID,
    professionalId: UUID.optional().or(
      z.literal("").transform(() => undefined),
    ),
    preferredDateStart: DATE,
    preferredDateEnd: DATE,
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((data) => data.preferredDateEnd >= data.preferredDateStart, {
    message: "Data fim deve ser depois ou igual à data início",
    path: ["preferredDateEnd"],
  });

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export function waitlistFormDataToInput(formData: FormData): unknown {
  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    customerUserId: opt("customerUserId"),
    customerName: opt("customerName") ?? "",
    customerPhone: opt("customerPhone"),
    serviceId: opt("serviceId") ?? "",
    professionalId: opt("professionalId"),
    preferredDateStart: opt("preferredDateStart") ?? "",
    preferredDateEnd: opt("preferredDateEnd") ?? "",
    notes: opt("notes"),
  };
}
