import { z } from "zod";

/**
 * Payload do webhook da Evolution API (evento MESSAGES_UPSERT).
 * Schema propositalmente mínimo: só o que o bot consome. Campos extras
 * são ignorados (a Evolution manda dezenas).
 */
export const evolutionInboundSchema = z.object({
  event: z.string(),
  instance: z.string().min(1),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional().default(false),
    }),
    pushName: z.string().optional(),
    message: z
      .object({
        conversation: z.string().optional(),
        extendedTextMessage: z.object({ text: z.string().optional() }).optional(),
      })
      .optional(),
  }),
});

export type EvolutionInboundPayload = z.infer<typeof evolutionInboundSchema>;

/** Extrai o texto da mensagem (conversation ou extendedTextMessage). */
export function extractMessageText(payload: EvolutionInboundPayload): string | null {
  const m = payload.data.message;
  return m?.conversation ?? m?.extendedTextMessage?.text ?? null;
}
