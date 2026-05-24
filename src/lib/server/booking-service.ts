import "server-only";

import { Prisma } from "@prisma/client";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { prismaAdmin, withTenant } from "@/lib/db";

import {
  calculateAvailableSlots,
  type AvailableSlot,
  type BusyInterval,
  type WorkingWindow,
} from "./slot-calculator";

const DEFAULT_MIN_ADVANCE_MINUTES = 30;

export type GetAvailableSlotsArgs = {
  organizationId: string;
  professionalId: string;
  serviceId: string;
  date: string; // 'YYYY-MM-DD' local
  now?: Date;
  force?: boolean; // admin walk-in: ignora antecedência
};

/**
 * Carrega WorkingHours + appointments + blocks + service + org do banco
 * (com RLS via `withTenant`) e devolve slots calculados.
 *
 * Em `force: true`, antecedência mínima vai a zero (RN-11 — encaixe admin).
 * RN-04 anti-conflito segue ativo mesmo com force.
 */
export async function getAvailableSlots(
  args: GetAvailableSlotsArgs,
): Promise<AvailableSlot[]> {
  const { organizationId, professionalId, serviceId, date, now, force } = args;

  return withTenant(organizationId, async (db) => {
    const [org, service, workingHoursRows, appointmentRows, blockRows] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      }),
      db.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: { durationMinutes: true, active: true },
      }),
      db.workingHours.findMany({
        where: { professionalId },
        select: { weekday: true, startMinute: true, endMinute: true },
      }),
      db.appointment.findMany({
        where: {
          professionalId,
          status: "CONFIRMED",
          startsAt: { gte: dayStartUtc(date), lt: dayEndUtc(date) },
        },
        select: { startsAt: true, endsAt: true },
      }),
      db.timeBlock.findMany({
        where: {
          professionalId,
          startsAt: { lt: dayEndUtc(date) },
          endsAt: { gt: dayStartUtc(date) },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    if (!service.active) return [];

    const workingHours: WorkingWindow[] = workingHoursRows;
    const existingAppointments: BusyInterval[] = appointmentRows;
    const blocks: BusyInterval[] = blockRows;

    return calculateAvailableSlots({
      workingHours,
      existingAppointments,
      blocks,
      durationMinutes: service.durationMinutes,
      date,
      timezone: org.timezone,
      minAdvanceMinutes: force ? 0 : DEFAULT_MIN_ADVANCE_MINUTES,
      now,
    });
  });
}

// ──────────────────────────────────────────────────────────────
// createBooking — fecha o fluxo cliente (PBI-08)
// ──────────────────────────────────────────────────────────────

export type CreateBookingArgs = {
  organizationId: string;
  professionalId: string; // já resolvido (não "any")
  serviceId: string;
  date: string; // 'YYYY-MM-DD' local
  time: string; // 'HH:MM' local
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  userId?: string; // se cliente está logado
  now?: Date;
};

export type CreateBookingResult = {
  appointmentId: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  isNewUser: boolean;
};

/**
 * Erro com `code = "SLOT_UNAVAILABLE"` significa que o slot escolhido não
 * está mais livre (perdido entre a tela e o submit, ou colisão concorrente
 * caçada pela EXCLUDE constraint do Postgres).
 */
export class BookingError extends Error {
  constructor(
    message: string,
    public code: "SLOT_UNAVAILABLE" | "VALIDATION" | "UNKNOWN",
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export async function createBooking(args: CreateBookingArgs): Promise<CreateBookingResult> {
  const { organizationId, professionalId, serviceId, date, time } = args;

  // Carrega timezone primeiro para conseguir comparar slot por label local.
  const orgTz = await prismaAdmin.organization
    .findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    })
    .then((o) => o.timezone);

  // Re-confere disponibilidade no servidor — defesa contra race entre tela e submit.
  // (EXCLUDE constraint do Postgres é o backstop final.)
  const slots = await getAvailableSlots({
    organizationId,
    professionalId,
    serviceId,
    date,
    now: args.now,
  });
  const chosen = slots.find((s) => formatHHMMIn(s.startUtc, orgTz) === time);
  if (!chosen) {
    throw new BookingError(
      "Esse horário acabou de ser pego. Escolha outro.",
      "SLOT_UNAVAILABLE",
    );
  }

  return withTenant(organizationId, async (db) => {
    const service = await db.service.findUniqueOrThrow({
      where: { id: serviceId },
      select: { durationMinutes: true, active: true },
    });
    if (!service.active) {
      throw new BookingError("Serviço inativo.", "VALIDATION");
    }

    const startsAtUtc = fromZonedTime(`${date}T${time}:00`, orgTz);
    const endsAtUtc = new Date(startsAtUtc.getTime() + service.durationMinutes * 60_000);

    // Resolve user: usa session (se logado) ou cria/encontra por email.
    // User vive na tabela global (sem RLS) — usa prismaAdmin.
    let userId = args.userId ?? null;
    let isNewUser = false;
    if (!userId) {
      const existing = await prismaAdmin.user.findUnique({
        where: { email: args.customerEmail },
        select: { id: true },
      });
      if (existing) {
        userId = existing.id;
      } else {
        const created = await prismaAdmin.user.create({
          data: {
            email: args.customerEmail,
            name: args.customerName,
            phone: args.customerPhone,
            // emailVerifiedAt = null → email de verificação será enviado em
            // fluxo separado (PBI-03 quando integrar Resend de verdade).
          },
          select: { id: true },
        });
        userId = created.id;
        isNewUser = true;
      }
    }

    try {
      const appointment = await db.appointment.create({
        data: {
          organizationId,
          professionalId,
          serviceId,
          userId,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          startsAt: startsAtUtc,
          endsAt: endsAtUtc,
        },
        select: { id: true },
      });
      return {
        appointmentId: appointment.id,
        startsAtUtc,
        endsAtUtc,
        isNewUser,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P2002" || /23P01|exclusion_violation/i.test(err.message))
      ) {
        throw new BookingError(
          "Esse horário acabou de ser pego. Escolha outro.",
          "SLOT_UNAVAILABLE",
        );
      }
      throw err;
    }
  });
}

// ──────────────────────────────────────────────────────────────
// Transições de estado — admin (PBI-09)
// ──────────────────────────────────────────────────────────────

export type CancelArgs = {
  organizationId: string;
  appointmentId: string;
  reason?: string;
  now?: Date;
};

const TWO_HOURS_MS = 2 * 60 * 60_000;

/**
 * Verifica se cancelar agora requer motivo (RN-07): < 2h antes do startsAt
 * ou após o início.
 */
export function cancelRequiresReason(startsAtUtc: Date, now = new Date()): boolean {
  return startsAtUtc.getTime() - now.getTime() < TWO_HOURS_MS;
}

/**
 * Cancela appointment. RN-07: motivo é obrigatório quando < 2h antes do
 * startsAt ou após o início.
 */
export async function cancelAppointment(args: CancelArgs): Promise<void> {
  const { organizationId, appointmentId, reason, now = new Date() } = args;

  await withTenant(organizationId, async (db) => {
    const appt = await db.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      select: { startsAt: true, status: true },
    });
    if (appt.status !== "CONFIRMED") {
      throw new BookingError(
        `Agendamento já está ${appt.status.toLowerCase()}.`,
        "VALIDATION",
      );
    }
    if (cancelRequiresReason(appt.startsAt, now) && !reason) {
      throw new BookingError(
        "Motivo é obrigatório quando cancela < 2h antes ou após o início.",
        "VALIDATION",
      );
    }
    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: reason,
      },
    });
  });
}

export type SimpleTransitionArgs = {
  organizationId: string;
  appointmentId: string;
};

export async function markCompleted(args: SimpleTransitionArgs): Promise<void> {
  await withTenant(args.organizationId, async (db) => {
    const appt = await db.appointment.findUniqueOrThrow({
      where: { id: args.appointmentId },
      select: { status: true },
    });
    if (appt.status !== "CONFIRMED") {
      throw new BookingError(`Agendamento já está ${appt.status.toLowerCase()}.`, "VALIDATION");
    }
    await db.appointment.update({
      where: { id: args.appointmentId },
      data: { status: "COMPLETED" },
    });
  });
}

export async function markNoShow(args: SimpleTransitionArgs): Promise<void> {
  await withTenant(args.organizationId, async (db) => {
    const appt = await db.appointment.findUniqueOrThrow({
      where: { id: args.appointmentId },
      select: { status: true },
    });
    if (appt.status !== "CONFIRMED") {
      throw new BookingError(`Agendamento já está ${appt.status.toLowerCase()}.`, "VALIDATION");
    }
    await db.appointment.update({
      where: { id: args.appointmentId },
      data: { status: "NO_SHOW" },
    });
  });
}

// ──────────────────────────────────────────────────────────────
// quickCreateBooking — encaixe admin (PBI-09, RN-11)
// ──────────────────────────────────────────────────────────────

export type QuickCreateBookingArgs = {
  organizationId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
};

/**
 * Cria appointment "forçado" (encaixe). Ignora RN-03/05/06 (granularidade,
 * antecedência, janela 60d) mas RN-04 anti-conflito ainda barra via
 * EXCLUDE constraint do Postgres.
 *
 * Não cria User — encaixe é registrado só com `customerName/Phone`
 * copy-on-write (sem `userId`). Cliente pode reivindicar depois se logar
 * com email match (v2).
 */
export async function quickCreateBooking(
  args: QuickCreateBookingArgs,
): Promise<{ appointmentId: string }> {
  return withTenant(args.organizationId, async (db) => {
    const [org, service] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: args.organizationId },
        select: { timezone: true },
      }),
      db.service.findUniqueOrThrow({
        where: { id: args.serviceId },
        select: { durationMinutes: true, active: true },
      }),
    ]);
    if (!service.active) throw new BookingError("Serviço inativo.", "VALIDATION");

    const startsAtUtc = fromZonedTime(`${args.date}T${args.time}:00`, org.timezone);
    const endsAtUtc = new Date(startsAtUtc.getTime() + service.durationMinutes * 60_000);

    try {
      const created = await db.appointment.create({
        data: {
          organizationId: args.organizationId,
          professionalId: args.professionalId,
          serviceId: args.serviceId,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          notes: args.notes,
          startsAt: startsAtUtc,
          endsAt: endsAtUtc,
        },
        select: { id: true },
      });
      return { appointmentId: created.id };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P2002" || /23P01|exclusion_violation/i.test(err.message))
      ) {
        throw new BookingError(
          "Conflito com outro agendamento nesse horário.",
          "SLOT_UNAVAILABLE",
        );
      }
      throw err;
    }
  });
}

// Formata um instante UTC como "HH:MM" no fuso da org. Mesma lógica do
// formatSlotLabel da page /horario, mantida aqui pra não acoplar UI ↔ server.
function formatHHMMIn(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  const hh = String(z.getHours()).padStart(2, "0");
  const mm = String(z.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const DAY_MS = 86_400_000;
// Pega ±24h em UTC do dia local. Folga cobre qualquer fuso ±12h sem perder
// intervalos que cruzam o dia. Filtro fino é o overlap-check do calculator.
function dayStartUtc(dateIso: string): Date {
  return new Date(new Date(`${dateIso}T00:00:00Z`).getTime() - DAY_MS);
}
function dayEndUtc(dateIso: string): Date {
  return new Date(new Date(`${dateIso}T00:00:00Z`).getTime() + 2 * DAY_MS);
}
