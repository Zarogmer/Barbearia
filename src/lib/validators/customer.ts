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
