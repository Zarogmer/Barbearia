"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/server/booking-service";
import { sendBookingConfirmation } from "@/lib/server/email/booking-confirmation";
import { getOrgBySlug, getOrgEvolutionInstanceBySlug } from "@/lib/server/orgs";
import { getProfessionalById, listProfessionalsForService } from "@/lib/server/professionals";
import { getActiveServiceById } from "@/lib/server/services-public";
import { requestOtp, verifyOtp } from "@/lib/server/otp";
import {
  requestOtpFormData,
  requestOtpSchema,
  verifyOtpFormData,
  verifyOtpSchema,
} from "@/lib/validators/otp";

import type { ConfirmBookingState } from "./state";

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}

function fieldErrorsFrom(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path[0]?.toString();
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

/**
 * Etapa 1 — captura nome + telefone, dispara WhatsApp com codigo de 6 digitos.
 * Sucesso: muda state pra step="verify" com phone normalizado.
 *
 * Bypass: se BOOKING_OTP_DISABLED=1, PULA o envio de codigo e cria o
 * appointment na hora. Usado quando a Evolution API esta fora do ar ou
 * durante testes locais sem WhatsApp real. Reflete tambem no client via
 * NEXT_PUBLIC_BOOKING_OTP_DISABLED (mesmo valor esperado). Se desligado
 * em prod, cancelamento < 2h fica sem contato direto verificado.
 */
export async function requestOtpAction(
  _prev: ConfirmBookingState,
  formData: FormData,
): Promise<ConfirmBookingState> {
  const parsed = requestOtpSchema.safeParse(requestOtpFormData(formData));
  if (!parsed.success) {
    return {
      step: "request",
      error: "Confira os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const data = parsed.data;

  // Bypass: OTP desativado por env. Cria o appointment direto — reusa
  // a mesma logica do verifyOtpAction (sem verificar codigo).
  if (isOtpDisabled()) {
    return await createBookingFromValidated({
      phone: data.phone,
      customerName: data.customerName,
      orgSlug: data.orgSlug,
      serviceId: data.serviceId,
      professionalId: data.professionalId,
      date: data.date,
      time: data.time,
      currentStep: "request",
    });
  }

  const ip = await clientIp();
  // PBI-51: roteia OTP pra instância Evolution da org. Null = usa fallback
  // global (compat com orgs antigas e desenvolvimento).
  const instance = (await getOrgEvolutionInstanceBySlug(data.orgSlug)) ?? undefined;
  const result = await requestOtp({ phone: data.phone, ip, instance });
  if (!result.ok) {
    return { step: "request", error: result.message };
  }

  return {
    step: "verify",
    phone: data.phone,
    customerName: data.customerName,
  };
}

function isOtpDisabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_BOOKING_OTP_DISABLED === "1" || process.env.BOOKING_OTP_DISABLED === "1"
  );
}

/**
 * Etapa 2 — verifica codigo. Em sucesso cria Appointment e redireciona.
 */
export async function verifyOtpAction(
  prev: ConfirmBookingState,
  formData: FormData,
): Promise<ConfirmBookingState> {
  const phoneInState = prev.step === "verify" ? prev.phone : undefined;
  const nameInState = prev.step === "verify" ? prev.customerName : undefined;

  const parsed = verifyOtpSchema.safeParse({
    ...verifyOtpFormData(formData),
    phone: phoneInState ?? formData.get("phone")?.toString() ?? "",
    customerName: nameInState ?? formData.get("customerName")?.toString() ?? "",
  });
  if (!parsed.success) {
    return {
      step: "verify",
      phone: phoneInState ?? "",
      customerName: nameInState ?? "",
      error: "Confira o código.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const data = parsed.data;

  const verification = await verifyOtp({ phone: data.phone, code: data.code });
  if (!verification.ok) {
    return {
      step: "verify",
      phone: data.phone,
      customerName: data.customerName,
      error: verification.message,
      attemptsRemaining:
        verification.code === "WRONG_CODE" ? verification.attemptsRemaining : undefined,
    };
  }

  return await createBookingFromValidated({
    phone: data.phone,
    customerName: data.customerName,
    orgSlug: data.orgSlug,
    serviceId: data.serviceId,
    professionalId: data.professionalId,
    date: data.date,
    time: data.time,
    currentStep: "verify",
  });
}

/**
 * Helper compartilhado: assumindo que phone + nome + slot ja passaram por
 * Zod, resolve org/service/professional, cria Appointment via createBooking,
 * envia email confirmacao se logado, revalida e redireciona pra tela final.
 *
 * `currentStep` controla o formato do state de erro (pra o `useActionState`
 * do form entender qual fase esta rodando: request quando OTP off, verify
 * quando OTP normal). Sucesso sempre termina em `redirect`.
 */
async function createBookingFromValidated(input: {
  phone: string;
  customerName: string;
  orgSlug: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  currentStep: "request" | "verify";
}): Promise<ConfirmBookingState> {
  const { phone, customerName, orgSlug, serviceId, professionalId, date, time, currentStep } =
    input;

  const errState = (error: string): ConfirmBookingState =>
    currentStep === "verify"
      ? { step: "verify", phone, customerName, error }
      : { step: "request", error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return errState("Barbearia não encontrada.");

  const service = await getActiveServiceById(org.id, serviceId);
  if (!service) return errState("Serviço inválido ou inativo.");

  let resolvedProfId = professionalId;
  if (professionalId === "any") {
    const candidates = await listProfessionalsForService(org.id, serviceId);
    if (candidates.length === 0) {
      return errState("Nenhum profissional disponível para esse serviço.");
    }
    resolvedProfId = candidates[0]!.id;
  }
  const professional = await getProfessionalById(org.id, resolvedProfId);
  if (!professional) return errState("Profissional inválido.");

  const session = await auth();
  const userId = session?.user?.id;

  let result;
  try {
    result = await createBooking({
      organizationId: org.id,
      professionalId: resolvedProfId,
      serviceId,
      date,
      time,
      customerName,
      customerPhone: phone,
      userId,
    });
  } catch (e) {
    if (e instanceof BookingError) return errState(e.message);
    console.error("createBooking unexpected error:", e);
    return errState("Não foi possível concluir o agendamento. Tente novamente.");
  }

  // Email so se houver email do user logado (PBI-23: agendamento anonimo
  // nao captura email — usuario pode adicionar depois ao vincular conta).
  if (session?.user?.email) {
    void sendBookingConfirmation({
      customerEmail: session.user.email,
      customerName,
      orgName: org.name,
      orgSlug: org.slug,
      serviceName: service.name,
      professionalName: professional.name,
      startsAtUtc: result.startsAtUtc,
      endsAtUtc: result.endsAtUtc,
      timezone: org.timezone,
      appointmentId: result.appointmentId,
    }).catch((err) => {
      console.error("sendBookingConfirmation failed (non-fatal):", err);
    });
  }

  revalidatePath(`/${orgSlug}/agendamento/${result.appointmentId}`);
  redirect(`/${orgSlug}/agendamento/${result.appointmentId}`);
}
