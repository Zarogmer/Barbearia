import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const messageTemplateSchema = z.object({
  id: UUID.optional(),
  title: z
    .string()
    .trim()
    .min(2, "Título muito curto")
    .max(80, "Título muito longo (máx 80)"),
  body: z
    .string()
    .trim()
    .min(5, "Mensagem muito curta")
    .max(2000, "Mensagem muito longa (máx 2000)"),
  key: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  active: z.boolean().default(true),
});

export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;

export function messageTemplateFormDataToInput(formData: FormData): unknown {
  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    id: opt("id"),
    title: opt("title") ?? "",
    body: opt("body") ?? "",
    key: opt("key"),
    active:
      formData.get("active") === "on" || formData.get("active") === "true",
  };
}
