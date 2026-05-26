import { z } from "zod";

export const createPostSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .max(2000, "URL muito longa"),
  caption: z
    .string()
    .trim()
    .max(280, "Legenda muito longa (máx 280)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export function postFormDataToInput(formData: FormData): unknown {
  return {
    imageUrl: formData.get("imageUrl"),
    caption: formData.get("caption"),
  };
}
