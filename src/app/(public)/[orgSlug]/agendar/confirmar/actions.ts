"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/server/booking-service";
import { sendBookingConfirmation } from "@/lib/server/email/booking-confirmation";
import {
  getOrgBySlug,
  getOrgEvolutionInstanceBySlug,
} from "@/lib/server/orgs";
import {
  getProfessionalById,
  listProfessionalsForService,
} from "@/lib/server/professionals";
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
 * Etapa 1 — captura nome + telefone, dispara SMS com codigo de 6 digitos.
 * Sucesso: muda state pra step="verify" com phone normalizado.
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

  const ip = await clientIp();
  // PBI-51: roteia OTP pra instância Evolution da org. Null = usa fallback
  // global (compat com orgs antigas e desenvolvimento).
  const instance =
    (await getOrgEvolutionInstanceBySlug(data.orgSlug)) ?? undefined;
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

  const org = await getOrgBySlug(data.orgSlug);
  if (!org) {
    return {
      step: "verify",
      phone: data.phone,
      customerName: data.customerName,
      error: "Barbearia não encontrada.",
    };
  }

  const service = await getActiveServiceById(org.id, data.serviceId);
  if (!service) {
    return {
      step: "verify",
      phone: data.phone,
      customerName: data.customerName,
      error: "Serviço inválido ou inativo.",
    };
  }

  let resolvedProfId = data.professionalId;
  if (data.professionalId === "any") {
    const candidates = await listProfessionalsForService(org.id, data.serviceId);
    if (candidates.length === 0) {
      return {
        step: "verify",
        phone: data.phone,
        customerName: data.customerName,
        error: "Nenhum profissional disponível para esse serviço.",
      };
    }
    resolvedProfId = candidates[0]!.id;
  }
  const professional = await getProfessionalById(org.id, resolvedProfId);
  if (!professional) {
    return {
      step: "verify",
      phone: data.phone,
      customerName: data.customerName,
      error: "Profissional inválido.",
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  let result;
  try {
    result = await createBooking({
      organizationId: org.id,
      professionalId: resolvedProfId,
      serviceId: data.serviceId,
      date: data.date,
      time: data.time,
      customerName: data.customerName,
      customerPhone: data.phone,
      userId,
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return {
        step: "verify",
        phone: data.phone,
        customerName: data.customerName,
        error: e.message,
      };
    }
    console.error("createBooking unexpected error:", e);
    return {
      step: "verify",
      phone: data.phone,
      customerName: data.customerName,
      error: "Não foi possível concluir o agendamento. Tente novamente.",
    };
  }

  // Email so se houver email do user logado (PBI-23: agendamento anonimo
  // nao captura email — usuario pode adicionar depois ao vincular conta).
  if (session?.user?.email) {
    void sendBookingConfirmation({
      customerEmail: session.user.email,
      customerName: data.customerName,
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

  revalidatePath(`/${data.orgSlug}/agendamento/${result.appointmentId}`);
  redirect(`/${data.orgSlug}/agendamento/${result.appointmentId}`);
}
