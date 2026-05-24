import "server-only";

import { withTenant } from "@/lib/db";

export type PublicAppointment = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  service: { name: string; durationMinutes: number; priceCents: number };
  professional: { name: string };
};

/**
 * Carrega 1 appointment público para a página de confirmação/detalhes
 * (`/[orgSlug]/agendamento/[id]`). RLS via withTenant garante que o ID
 * só resolve se pertencer à org do slug.
 */
export async function getAppointmentById(
  organizationId: string,
  id: string,
): Promise<PublicAppointment | null> {
  return withTenant(organizationId, async (db) => {
    const a = await db.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        startsAt: true,
        endsAt: true,
        status: true,
        service: { select: { name: true, durationMinutes: true, priceCents: true } },
        professional: { select: { name: true } },
      },
    });
    return a;
  });
}
