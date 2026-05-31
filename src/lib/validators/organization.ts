import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_OR_EMPTY = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Use uma URL completa (https://...)",
  })
  .transform((v) => (v === "" ? null : v))
  .nullable();

const hoursBlockSchema = z
  .object({
    open: z.number().int().min(0).max(24 * 60),
    close: z.number().int().min(0).max(24 * 60),
  })
  .refine((b) => b.close > b.open, {
    message: "Horário de fechamento deve ser depois do de abertura",
  });

const businessHoursSchema = z
  .object({
    sun: hoursBlockSchema.nullable().optional(),
    mon: hoursBlockSchema.nullable().optional(),
    tue: hoursBlockSchema.nullable().optional(),
    wed: hoursBlockSchema.nullable().optional(),
    thu: hoursBlockSchema.nullable().optional(),
    fri: hoursBlockSchema.nullable().optional(),
    sat: hoursBlockSchema.nullable().optional(),
  })
  .nullable()
  .optional();

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
  // PBI-43
  allowMultipleSimultaneousBookings: z.boolean().default(false),
  allowOverbookEncaixe: z.boolean().default(true),
  // PBI-45 — taxa em basis points × 10 (4.99% = 499). 0 = sem taxa.
  creditCardFeeBp: z.coerce.number().int().min(0).max(5000).default(0),
  debitCardFeeBp: z.coerce.number().int().min(0).max(5000).default(0),
  // Vitrine (PBI-26)
  coverImageUrl: URL_OR_EMPTY.optional(),
  tagline: z
    .string()
    .trim()
    .max(120, "Tagline muito longa (máx 120)")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  address: z
    .string()
    .trim()
    .max(200, "Endereço muito longo (máx 200)")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  instagram: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v.replace(/^@/, "")))
    .nullable()
    .optional(),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  businessHours: businessHoursSchema,
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Converte FormData do form de configurações em input pro Zod.
 *
 * Campos novos (PBI-26):
 *  - businessHours vem como JSON string (form serializa estado React)
 */
export function organizationFormDataToInput(formData: FormData): unknown {
  const bhRaw = formData.get("businessHours");
  let businessHours: unknown = undefined;
  if (typeof bhRaw === "string" && bhRaw.length > 0) {
    try {
      businessHours = JSON.parse(bhRaw);
    } catch {
      businessHours = undefined;
    }
  }
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    allowGuestBooking:
      formData.get("allowGuestBooking") === "on" ||
      formData.get("allowGuestBooking") === "true",
    allowMultipleSimultaneousBookings:
      formData.get("allowMultipleSimultaneousBookings") === "on" ||
      formData.get("allowMultipleSimultaneousBookings") === "true",
    allowOverbookEncaixe:
      formData.get("allowOverbookEncaixe") === "on" ||
      formData.get("allowOverbookEncaixe") === "true",
    creditCardFeeBp: Math.round(
      Number(formData.get("creditCardFeePercent") ?? 0) * 100,
    ),
    debitCardFeeBp: Math.round(
      Number(formData.get("debitCardFeePercent") ?? 0) * 100,
    ),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    tagline: formData.get("tagline") ?? "",
    address: formData.get("address") ?? "",
    instagram: formData.get("instagram") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    businessHours,
  };
}
