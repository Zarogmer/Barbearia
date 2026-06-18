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
 * Etapa 2 do signup: verifica código (avança pra etapa 3, NÃO cria User).
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

/**
 * Slug da Organization: kebab-case, [a-z0-9-], 3..40 chars, sem hífens
 * duplicados ou nas pontas. Vira parte da URL pública (/<slug>/agendar)
 * então precisa ser amigável.
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Etapa 3 do signup: cria User + Organization + Membership(OWNER) em uma
 * transação. Trial de 14 dias setado em Organization.trialEndsAt.
 */
export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().transform(normalizePhone).pipe(PHONE_E164),
  passwordHash: z.string().min(20, "Sessão inválida. Comece de novo."),
  orgName: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(60, "Nome muito longo"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug muito curto (min 3)")
    .max(40, "Slug muito longo (max 40)")
    .regex(SLUG_RE, "Use letras, números e hífens (ex: salao-do-jose)"),
});
export type CreateOrgInput = z.infer<typeof createOrgSchema>;

/**
 * PBI-50: pedido inicial de reset — só email. Sucesso retorna 200
 * sempre (não revela se email existe), então schema é mínimo.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido").max(254),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * PBI-50: troca da senha com token vindo do email. Token formato
 * `<uuid>.<random>` validado em verifyAndResetPassword.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "Link inválido"),
    password: z
      .string()
      .min(8, "Senha precisa ter pelo menos 8 caracteres")
      .max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Gera slug determinístico a partir de um nome humano.
 * "Salão do José" → "salao-do-jose"
 * Não garante unicidade — checagem é no banco.
 */
export function slugifyOrgName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos pós-NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
