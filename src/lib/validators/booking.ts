import { z } from "zod";

const UUID = z.string().uuid("ID inválido");
const ISO_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)");
const HHMM = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido (use HH:MM)");

export const confirmBookingSchema = z.object({
  orgSlug: z.string().trim().min(1),
  serviceId: UUID,
  // "any" é tratado fora do Zod (resolvido para UUID antes do parse final)
  professionalId: UUID,
  date: ISO_DATE,
  time: HHMM,
  customerName: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido"),
  customerPhone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  acceptedTerms: z
    .literal(true, { message: "Você precisa aceitar os termos de cancelamento" }),
});

export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;

/**
 * Converte FormData (action de form HTML) num objeto pronto pra Zod.
 * Trata o checkbox como boolean.
 */
export function bookingFormDataToInput(
  formData: FormData,
  ctx: { orgSlug: string; serviceId: string; professionalId: string; date: string; time: string },
): unknown {
  return {
    orgSlug: ctx.orgSlug,
    serviceId: ctx.serviceId,
    professionalId: ctx.professionalId,
    date: ctx.date,
    time: ctx.time,
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    acceptedTerms:
      formData.get("acceptedTerms") === "on" || formData.get("acceptedTerms") === "true",
  };
}
