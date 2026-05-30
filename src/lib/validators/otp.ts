import { z } from "zod";

const PHONE_RAW = z.string().trim().min(1, "Telefone obrigatório");

/**
 * Normaliza telefone BR pra E.164 (+5511999998888).
 * Aceita: (11) 99999-8888, 11999998888, +5511999998888, etc.
 * Telefones de outros paises devem vir ja com prefixo +DD.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) {
    return `+${digits}`;
  }
  // Sem prefixo internacional: assume BR (+55).
  // Aceita 10 ou 11 digitos (com DDD).
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  // Ja com 55 na frente sem o +
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) return `+${digits}`;
  }
  return `+${digits}`; // fallback — Zod refine valida formato depois
}

const PHONE_E164 = z
  .string()
  .regex(/^\+[1-9]\d{9,14}$/, "Telefone inválido. Use formato com DDD.");

export const requestOtpSchema = z.object({
  phone: PHONE_RAW.transform(normalizePhone).pipe(PHONE_E164),
  customerName: z.string().trim().min(2, "Nome muito curto").max(80),
  acceptedTerms: z.literal("on", {
    errorMap: () => ({ message: "Aceite os termos pra continuar" }),
  }),
  // Contexto do agendamento (passado via hidden inputs no form)
  orgSlug: z.string().min(1),
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: PHONE_RAW.transform(normalizePhone).pipe(PHONE_E164),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
  customerName: z.string().trim().min(2).max(80),
  orgSlug: z.string().min(1),
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** Helper pra extrair FormData → input bruto. Validacao final via Zod. */
export function requestOtpFormData(fd: FormData): Record<string, unknown> {
  return {
    phone: fd.get("phone")?.toString() ?? "",
    customerName: fd.get("customerName")?.toString() ?? "",
    acceptedTerms: fd.get("acceptedTerms")?.toString() ?? "",
    orgSlug: fd.get("orgSlug")?.toString() ?? "",
    serviceId: fd.get("serviceId")?.toString() ?? "",
    professionalId: fd.get("professionalId")?.toString() ?? "",
    date: fd.get("date")?.toString() ?? "",
    time: fd.get("time")?.toString() ?? "",
  };
}

export function verifyOtpFormData(fd: FormData): Record<string, unknown> {
  return {
    phone: fd.get("phone")?.toString() ?? "",
    code: fd.get("code")?.toString() ?? "",
    customerName: fd.get("customerName")?.toString() ?? "",
    orgSlug: fd.get("orgSlug")?.toString() ?? "",
    serviceId: fd.get("serviceId")?.toString() ?? "",
    professionalId: fd.get("professionalId")?.toString() ?? "",
    date: fd.get("date")?.toString() ?? "",
    time: fd.get("time")?.toString() ?? "",
  };
}
