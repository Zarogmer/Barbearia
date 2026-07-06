"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BookingError, cancelAppointment } from "@/lib/server/booking-service";
import { prismaAdmin } from "@/lib/db";
import { getOrgBySlug } from "@/lib/server/orgs";

/**
 * PBI-65: cancelamento pelo proprio cliente na tela /agendamento/[id].
 *
 * Modelo de auth: quem tem o UUID (recebeu por email/WA/tela de confirmar)
 * pode cancelar. Sem sessao — mesmo modelo da pagina publica de detalhes.
 * Trade-off aceito: URL do agendamento e "token secret". Nao aparece no
 * fluxo publico do cliente sem passar por confirmar.
 *
 * Se startsAt < 2h da hora atual OU ja passou, motivo obrigatorio (regra
 * do proprio cancelAppointment, herdada do admin).
 */

const cancelSchema = z.object({
  orgSlug: z.string().min(1),
  appointmentId: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  reason: z.string().trim().min(2).max(500).optional(),
});

export type CancelByCustomerResult = { ok: true } | { ok: false; error: string };

export async function cancelBookingByCustomerAction(
  input: unknown,
): Promise<CancelByCustomerResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Requisicao invalida." };
  }
  const { orgSlug, appointmentId, reason } = parsed.data;

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { ok: false, error: "Loja nao encontrada." };

  // Confere que o appointment pertence de fato a essa org (defesa contra
  // troca de slug pra tentar cancelar appointment de outra org).
  const check = await prismaAdmin.appointment.findUnique({
    where: { id: appointmentId },
    select: { organizationId: true },
  });
  if (!check || check.organizationId !== org.id) {
    return { ok: false, error: "Agendamento nao encontrado." };
  }

  try {
    await cancelAppointment({
      organizationId: org.id,
      appointmentId,
      reason,
    });
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, error: e.message };
    console.error("cancelBookingByCustomer failed:", e);
    return { ok: false, error: "Nao foi possivel cancelar." };
  }

  revalidatePath(`/${orgSlug}/agendamento/${appointmentId}`);
  return { ok: true };
}
