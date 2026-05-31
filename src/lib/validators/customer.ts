import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const customerNoteSchema = z.object({
  customerUserId: UUID,
  body: z
    .string()
    .trim()
    .min(2, "Anotação muito curta")
    .max(2000, "Anotação muito longa (máx 2000)"),
});

export type CustomerNoteInput = z.infer<typeof customerNoteSchema>;

export const searchCustomerSchema = z.object({
  query: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchCustomerInput = z.infer<typeof searchCustomerSchema>;

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "Email muito longo")
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser AAAA-MM-DD")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export function createCustomerFormDataToInput(formData: FormData): unknown {
  return {
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    birthDate: formData.get("birthDate") ?? "",
  };
}
