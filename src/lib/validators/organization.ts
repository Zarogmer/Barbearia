import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo (máx 80)"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug muito curto (mín 3)")
    .max(50, "Slug muito longo (máx 50)")
    .regex(SLUG_RE, "Use apenas letras minúsculas, números e hífen (kebab-case)"),
  allowGuestBooking: z.boolean().default(true),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export function organizationFormDataToInput(formData: FormData): unknown {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    allowGuestBooking:
      formData.get("allowGuestBooking") === "on" ||
      formData.get("allowGuestBooking") === "true",
  };
}
