import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const cancelAppointmentSchema = z.object({
  id: UUID,
  reason: z
    .string()
    .trim()
    .max(280, "Motivo muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  requiresReason: z.boolean(),
});

export const cancelAppointmentSchemaWithReason = cancelAppointmentSchema.refine(
  (v) => !v.requiresReason || (v.reason && v.reason.length >= 2),
  {
    message: "Motivo é obrigatório quando cancela < 2h antes ou após o início.",
    path: ["reason"],
  },
);

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const quickBookingSchema = z.object({
  professionalId: UUID,
  serviceId: UUID,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  customerName: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
  customerPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(280)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type QuickBookingInput = z.infer<typeof quickBookingSchema>;

export function quickBookingFormDataToInput(formData: FormData): unknown {
  return {
    professionalId: formData.get("professionalId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    notes: formData.get("notes"),
  };
}
