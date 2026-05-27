import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const upsertCommissionRuleSchema = z.object({
  professionalId: UUID,
  serviceId: UUID.optional().or(z.literal("").transform(() => undefined)),
  percent: z.coerce.number().int().min(0).max(100),
});

export type UpsertCommissionRuleInput = z.infer<typeof upsertCommissionRuleSchema>;

export const calculateCommissionSchema = z.object({
  professionalId: UUID,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
});

export type CalculateCommissionInput = z.infer<typeof calculateCommissionSchema>;

export const payCommissionSchema = calculateCommissionSchema.extend({
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type PayCommissionInput = z.infer<typeof payCommissionSchema>;
