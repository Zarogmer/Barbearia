import "server-only";

import { withTenant } from "@/lib/db";

const DAY_MS = 86_400_000;

export type AgendaAppointment = {
  id: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
  professionalName: string;
  notes: string | null;
  // PDV inline (PBI balcão): preenchidos quando admin marca como pago
  // direto na agenda (sem usar fluxo de Comanda).
  paymentMethod: "CASH" | "PIX" | "CREDIT" | "DEBIT" | "CORTESIA" | null;
  paidAt: Date | null;
};

export type AgendaProfessional = {
  id: string;
  name: string;
  active: boolean;
  appointmentsCount: number;
};

export type AgendaTimeBlock = {
  id: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export type DayAgenda = {
  professionals: AgendaProfessional[];
  appointments: AgendaAppointment[];
  blocks: AgendaTimeBlock[];
  timezone: string;
};

export type GetDayAgendaArgs = {
  organizationId: string;
  date: string; // 'YYYY-MM-DD' local
  /**
   * Quando passado, restringe a 1 profissional (caso STAFF — RN-14).
   * Para OWNER, omitir.
   */
  onlyProfessionalId?: string;
};

/**
 * Carrega agenda do dia. RLS via withTenant garante isolamento de tenant.
 * Quando `onlyProfessionalId` é passado (STAFF), filtra appointments/blocks
 * desse profissional apenas e retorna 1 coluna no `professionals`.
 *
 * Range UTC: ±24h do dia local para cobrir qualquer fuso sem perder
 * intervalos que cruzam meia-noite local.
 */
export async function getDayAgenda(args: GetDayAgendaArgs): Promise<DayAgenda> {
  const { organizationId, date, onlyProfessionalId } = args;
  const rangeStart = new Date(new Date(`${date}T00:00:00Z`).getTime() - DAY_MS);
  const rangeEnd = new Date(new Date(`${date}T00:00:00Z`).getTime() + 2 * DAY_MS);

  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });

    const professionalsWhere = onlyProfessionalId
      ? { id: onlyProfessionalId, active: true }
      : { active: true };

    // Mostra tudo exceto CANCELLED: COMPLETED e NO_SHOW continuam no
    // calendario com cor diferente (decisao UX — admin sabe o que aconteceu
    // sem precisar trocar de tela). CANCELLED some pra nao poluir.
    const apptsWhere = {
      status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] satisfies Array<"CONFIRMED" | "COMPLETED" | "NO_SHOW"> as ("CONFIRMED" | "COMPLETED" | "NO_SHOW")[] },
      startsAt: { gte: rangeStart, lt: rangeEnd },
      ...(onlyProfessionalId ? { professionalId: onlyProfessionalId } : {}),
    };

    const blocksWhere = {
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
      ...(onlyProfessionalId ? { professionalId: onlyProfessionalId } : {}),
    };

    const [professionalsRows, appointmentRows, blockRows] = await Promise.all([
      db.professional.findMany({
        where: professionalsWhere,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          active: true,
          _count: {
            select: {
              appointments: {
                where: {
                  status: "CONFIRMED",
                  startsAt: { gte: rangeStart, lt: rangeEnd },
                },
              },
            },
          },
        },
      }),
      db.appointment.findMany({
        where: apptsWhere,
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          professionalId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          paymentMethod: true,
          paidAt: true,
          notes: true,
          customerName: true,
          customerPhone: true,
          service: {
            select: { name: true, durationMinutes: true, priceCents: true },
          },
          professional: { select: { name: true } },
        },
      }),
      db.timeBlock.findMany({
        where: blocksWhere,
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          professionalId: true,
          startsAt: true,
          endsAt: true,
          reason: true,
        },
      }),
    ]);

    const professionals: AgendaProfessional[] = professionalsRows.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      appointmentsCount: p._count.appointments,
    }));

    const appointments: AgendaAppointment[] = appointmentRows.map((a) => ({
      id: a.id,
      professionalId: a.professionalId,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      paymentMethod: a.paymentMethod,
      paidAt: a.paidAt,
      notes: a.notes,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      serviceName: a.service.name,
      serviceDurationMinutes: a.service.durationMinutes,
      servicePriceCents: a.service.priceCents,
      professionalName: a.professional.name,
    }));

    return {
      professionals,
      appointments,
      blocks: blockRows,
      timezone: org.timezone,
    };
  });
}

/**
 * Carrega 1 appointment pelo ID (com RLS). Usado pelos dialogs de detalhe
 * quando precisa de dados frescos.
 */
export async function getAppointmentForAdmin(
  organizationId: string,
  appointmentId: string,
): Promise<AgendaAppointment | null> {
  return withTenant(organizationId, async (db) => {
    const a = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        professionalId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        notes: true,
        customerName: true,
        customerPhone: true,
        service: {
          select: { name: true, durationMinutes: true, priceCents: true },
        },
        professional: { select: { name: true } },
      },
    });
    if (!a) return null;
    return {
      id: a.id,
      professionalId: a.professionalId,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      paymentMethod: a.paymentMethod,
      paidAt: a.paidAt,
      notes: a.notes,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      serviceName: a.service.name,
      serviceDurationMinutes: a.service.durationMinutes,
      servicePriceCents: a.service.priceCents,
      professionalName: a.professional.name,
    };
  });
}
