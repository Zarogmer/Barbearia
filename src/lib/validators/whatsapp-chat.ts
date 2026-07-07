import { z } from "zod";

/**
 * Resposta dentro de uma conversa do painel (aba Conversas). O destino é
 * o JID da conversa — cobre contato normal (@s.whatsapp.net) e o
 * identificador anônimo @lid, que não tem telefone extraível.
 */
export const replyChatSchema = z.object({
  remoteJid: z.string().regex(/^\d+(:\d+)?@(s\.whatsapp\.net|lid)$/, "JID de conversa inválido"),
  text: z.string().trim().min(1, "Mensagem vazia").max(4096),
});

export type ReplyChatInput = z.infer<typeof replyChatSchema>;
