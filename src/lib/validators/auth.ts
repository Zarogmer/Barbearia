import { z } from "zod";

import { normalizePhone } from "./otp";

export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(254),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres").max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

const PHONE_E164 = z
  .string()
  .regex(/^\+[1-9]\d{9,14}$/, "Telefone inválido. Use DDD + número.");

/**
 * Etapa 1 do signup: valida campos + dispara OTP por WhatsApp.
 * Telefone obrigatório — vira credencial de verificação.
 */
export const requestSignupSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(254),
  phone: z
    .string()
    .trim()
    .min(1, "Telefone obrigatório")
    .transform(normalizePhone)
    .pipe(PHONE_E164),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres").max(72),
  acceptedTerms: z.literal("on", {
    errorMap: () => ({ message: "Aceite os termos pra continuar" }),
  }),
});
export type RequestSignupInput = z.infer<typeof requestSignupSchema>;

/**
 * Etapa 2 do signup: verifica código + cria User.
 * passwordHash é o bcrypt computado na etapa 1 (carregado via hidden input).
 * Garantia: o hash sozinho não permite login (precisa do plaintext); HTTPS
 * protege a transmissão e ele é o mesmo valor que vai pro DB.
 */
export const verifySignupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().transform(normalizePhone).pipe(PHONE_E164),
  passwordHash: z.string().min(20, "Sessão inválida. Comece de novo."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
});
export type VerifySignupInput = z.infer<typeof verifySignupSchema>;
