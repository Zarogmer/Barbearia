import { z } from "zod";

export const createReviewSchema = z.object({
  appointmentId: z.string().uuid("ID inválido"),
  rating: z
    .number({ message: "Avaliação obrigatória" })
    .int()
    .min(1, "Mínimo 1 estrela")
    .max(5, "Máximo 5 estrelas"),
  comment: z
    .string()
    .trim()
    .max(500, "Comentário muito longo (máx 500)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
