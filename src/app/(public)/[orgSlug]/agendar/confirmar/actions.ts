"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/server/booking-service";
import { sendBookingConfirmation } from "@/lib/server/email/booking-confirmation";
import { getOrgBySlug } from "@/lib/server/orgs";
import {
  getProfessionalById,
  listProfessionalsForService,
} from "@/lib/server/professionals";
import { getActiveServiceById } from "@/lib/server/services-public";
import {
  bookingFormDataToInput,
  confirmBookingSchema,
} from "@/lib/validators/booking";

import type { ConfirmBookingState } from "./state";

export async function confirmBookingAction(
  ctx: {
    orgSlug: string;
    serviceId: string;
    professionalId: string;
    date: string;
    time: string;
  },
  _prevState: ConfirmBookingState,
  formData: FormData,
): Promise<ConfirmBookingState> {
  const parsed = confirmBookingSchema.safeParse(bookingFormDataToInput(formData, ctx));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  const org = await getOrgBySlug(data.orgSlug);
  if (!org) return { error: "Barbearia não encontrada." };

  const service = await getActiveServiceById(org.id, data.serviceId);
  if (!service) return { error: "Serviço inválido ou inativo." };

  // Resolve "any" se o usuário não escolheu profissional específico.
  // RN-12: primeiro alfabético que executa o serviço.
  let resolvedProfId = data.professionalId;
  if (ctx.professionalId === "any") {
    const candidates = await listProfessionalsForService(org.id, data.serviceId);
    if (candidates.length === 0) {
      return { error: "Nenhum profissional disponível para esse serviço." };
    }
    resolvedProfId = candidates[0]!.id;
  }
  const professional = await getProfessionalById(org.id, resolvedProfId);
  if (!professional) return { error: "Profissional inválido." };

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
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      userId,
    });
  } catch (e) {
    if (e instanceof BookingError) {
      return { error: e.message };
    }
    console.error("createBooking unexpected error:", e);
    return { error: "Não foi possível concluir o agendamento. Tente novamente." };
  }

  // Email fire-and-forget — não bloqueia confirmação.
  void sendBookingConfirmation({
    customerEmail: data.customerEmail,
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

  revalidatePath(`/${data.orgSlug}/agendar/horario`);
  revalidatePath(`/${data.orgSlug}/agendamento/${result.appointmentId}`);
  redirect(`/${data.orgSlug}/agendamento/${result.appointmentId}`);
}

