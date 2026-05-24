import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(254),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres").max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(80),
  email: z.string().email("Email inválido").max(254),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres").max(72),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{8,20}$/u, "Telefone inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type SignupInput = z.infer<typeof signupSchema>;
