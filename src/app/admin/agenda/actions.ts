"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  BookingError,
  cancelAppointment,
  markCompleted as markCompletedSvc,
  markNoShow as markNoShowSvc,
  quickCreateBooking,
} from "@/lib/server/booking-service";
import { getAppointmentForAdmin } from "@/lib/server/agenda";
import {
  cancelAppointmentSchemaWithReason,
  quickBookingFormDataToInput,
  quickBookingSchema,
} from "@/lib/validators/appointment";

import type { AdminAgendaActionResult } from "./state";

async function requireAdminOrg(): Promise<
  { orgId: string; canManageAll: boolean; ownProfessionalId: string | null } | { error: string }
> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada. Faça login novamente." };

  const membership = session.user.memberships[0];
  if (!membership) return { error: "Você não pertence a nenhuma organização." };

  return {
    orgId: membership.organizationId,
    canManageAll: membership.role === "OWNER",
    ownProfessionalId: membership.professionalId,
  };
}

/**
 * Verifica se o usuário corrente pode operar sobre o appointment.
 * STAFF só mexe nos próprios (mesmo professionalId). OWNER mexe em qualquer.
 */
async function authorizeOnAppointment(
  appointmentId: string,
): Promise<{ orgId: string } | { error: string }> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return ctx;

  const appt = await getAppointmentForAdmin(ctx.orgId, appointmentId);
  if (!appt) return { error: "Agendamento não encontrado." };

  if (!ctx.canManageAll && appt.professionalId !== ctx.ownProfessionalId) {
    return { error: "Você só pode gerenciar agendamentos próprios." };
  }
  return { orgId: ctx.orgId };
}

export async function cancelAppointmentAction(
  appointmentId: string,
  reason: string | undefined,
  requiresReason: boolean,
): Promise<AdminAgendaActionResult> {
  const parsed = cancelAppointmentSchemaWithReason.safeParse({
    id: appointmentId,
    reason: reason || undefined,
    requiresReason,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  const authz = await authorizeOnAppointment(appointmentId);
  if ("error" in authz) return { error: authz.error };

  try {
    await cancelAppointment({
      organizationId: authz.orgId,
      appointmentId,
      reason: parsed.data.reason,
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error("cancelAppointment failed:", e);
    return { error: "Não foi possível cancelar." };
  }

  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function markCompletedAction(
  appointmentId: string,
): Promise<AdminAgendaActionResult> {
  const authz = await authorizeOnAppointment(appointmentId);
  if ("error" in authz) return { error: authz.error };

  try {
    await markCompletedSvc({ organizationId: authz.orgId, appointmentId });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error("markCompleted failed:", e);
    return { error: "Não foi possível concluir." };
  }

  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function markNoShowAction(
  appointmentId: string,
): Promise<AdminAgendaActionResult> {
  const authz = await authorizeOnAppointment(appointmentId);
  if ("error" in authz) return { error: authz.error };

  try {
    await markNoShowSvc({ organizationId: authz.orgId, appointmentId });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error("markNoShow failed:", e);
    return { error: "Não foi possível marcar no-show." };
  }

  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function quickCreateBookingAction(
  _prev: AdminAgendaActionResult,
  formData: FormData,
): Promise<AdminAgendaActionResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = quickBookingSchema.safeParse(quickBookingFormDataToInput(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  // STAFF só pode criar encaixe pra si mesmo.
  if (!ctx.canManageAll && parsed.data.professionalId !== ctx.ownProfessionalId) {
    return { error: "STAFF só pode encaixar agendamentos próprios." };
  }

  try {
    await quickCreateBooking({
      organizationId: ctx.orgId,
      professionalId: parsed.data.professionalId,
      serviceId: parsed.data.serviceId,
      date: parsed.data.date,
      time: parsed.data.time,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      notes: parsed.data.notes,
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error("quickCreateBooking failed:", e);
    return { error: "Não foi possível criar o encaixe." };
  }

  revalidatePath("/admin/agenda");
  return { ok: true };
}

