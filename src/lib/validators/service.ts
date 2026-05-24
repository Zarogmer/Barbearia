import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const serviceBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome precisa ter pelo menos 2 caracteres")
    .max(80, "Nome muito longo (máx 80)"),
  description: z
    .string()
    .trim()
    .max(500, "Descrição muito longa (máx 500)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  durationMinutes: z
    .number({ message: "Duração obrigatória" })
    .int("Duração precisa ser inteira")
    .min(5, "Mínimo 5 minutos")
    .max(240, "Máximo 240 minutos (4 horas)")
    .refine((v) => v % 5 === 0, "Duração precisa ser múltiplo de 5"),
  priceCents: z
    .number({ message: "Preço obrigatório" })
    .int("Preço em centavos precisa ser inteiro")
    .min(0, "Preço não pode ser negativo")
    .max(100_000, "Preço máximo R$ 1.000,00 no MVP"),
  active: z.boolean().default(true),
  professionalIds: z
    .array(UUID)
    .max(50, "Máximo 50 profissionais por serviço")
    .default([]),
});

export const createServiceSchema = serviceBaseSchema;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = serviceBaseSchema.extend({
  id: UUID,
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceIdSchema = z.object({ id: UUID });

/**
 * Converte FormData (de form HTML) num objeto pronto pra Zod parse.
 * Trata os tipos: durationMinutes/priceCents como number, active como boolean,
 * professionalIds como array (campo multi-valued).
 */
export function serviceFormDataToInput(formData: FormData): unknown {
  const professionalIds = formData
    .getAll("professionalIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  return {
    name: formData.get("name"),
    description: formData.get("description"),
    durationMinutes: Number(formData.get("durationMinutes")),
    priceCents: Math.round(Number(formData.get("priceCents")) * 100),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    professionalIds,
  };
}
