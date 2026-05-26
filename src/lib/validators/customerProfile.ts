import { z } from "zod";

export const updateCustomerProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;

export function customerProfileFormDataToInput(formData: FormData): unknown {
  return {
    name: formData.get("name"),
    phone: formData.get("phone"),
  };
}
