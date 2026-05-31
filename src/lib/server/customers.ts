import "server-only";

import { prismaAdmin, withTenant } from "@/lib/db";

export type CustomerListItem = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  appointmentsCount: number;
  lastVisitAt: Date | null;
};

export type CustomerListResult = {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Lista clientes da org com paginacao e search (nome ou email).
 * "Cliente" = User que tem pelo menos 1 Appointment na org.
 *
 * Usa prismaAdmin pra fazer a query global (User é tabela compartilhada),
 * filtra por appointments.organizationId pra obter "clientes da org".
 */
export async function listCustomersAdmin(
  organizationId: string,
  query: string | undefined,
  page: number,
  pageSize: number,
): Promise<CustomerListResult> {
  const skip = (page - 1) * pageSize;
  const q = query?.trim() ?? "";

  const where = {
    appointments: { some: { organizationId } },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prismaAdmin.user.count({ where }),
    prismaAdmin.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        appointments: {
          where: { organizationId },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true },
        },
        _count: {
          select: {
            appointments: { where: { organizationId } },
          },
        },
      },
    }),
  ]);

  const items: CustomerListItem[] = rows.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    appointmentsCount: u._count.appointments,
    lastVisitAt: u.appointments[0]?.startsAt ?? null,
  }));

  return { items, total, page, pageSize };
}

// ────────────────────────────────────────────────────────────
// Detalhe + stats do cliente
// ────────────────────────────────────────────────────────────

export type CustomerStats = {
  totalAppointments: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  upcomingCount: number;
  totalSpentCents: number; // sum priceCents de COMPLETED
  expectedRevenueCents: number; // sum priceCents de CONFIRMED futuros
  lastVisitAt: Date | null;
  firstSeenAt: Date | null;
};

export type CustomerDetail = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  birthDate: Date | null;
  stats: CustomerStats;
};

export async function getCustomerDetail(
  organizationId: string,
  userId: string,
): Promise<CustomerDetail | null> {
  // User pode existir globalmente mas precisa ter appointment na org
  // pra ser "cliente daquela org". Usa prismaAdmin pra User + withTenant
  // pra appointments (respeitando RLS).
  const user = await prismaAdmin.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, birthDate: true },
  });
  if (!user) return null;

  const appts = await withTenant(organizationId, (db) =>
    db.appointment.findMany({
      where: { userId },
      orderBy: { startsAt: "asc" },
      select: {
        startsAt: true,
        status: true,
        service: { select: { priceCents: true } },
      },
    }),
  );

  if (appts.length === 0) return null;

  const now = new Date();
  let completedCount = 0;
  let cancelledCount = 0;
  let noShowCount = 0;
  let upcomingCount = 0;
  let totalSpentCents = 0;
  let expectedRevenueCents = 0;

  for (const a of appts) {
    switch (a.status) {
      case "COMPLETED":
        completedCount += 1;
        totalSpentCents += a.service.priceCents;
        break;
      case "CANCELLED":
        cancelledCount += 1;
        break;
      case "NO_SHOW":
        noShowCount += 1;
        break;
      case "CONFIRMED":
        if (a.startsAt > now) {
          upcomingCount += 1;
          expectedRevenueCents += a.service.priceCents;
        } else {
          // CONFIRMED no passado: trata como pendente de marcação manual
          // (admin esqueceu de COMPLETED). Conta nos stats como total mas
          // não soma em receita realizada.
        }
        break;
    }
  }

  const firstSeenAt = appts[0]?.startsAt ?? null;
  const lastVisitAt = appts.at(-1)?.startsAt ?? null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    birthDate: user.birthDate,
    stats: {
      totalAppointments: appts.length,
      completedCount,
      cancelledCount,
      noShowCount,
      upcomingCount,
      totalSpentCents,
      expectedRevenueCents,
      lastVisitAt,
      firstSeenAt,
    },
  };
}

// ────────────────────────────────────────────────────────────
// Atendimentos do cliente (para tab Atendimentos)
// ────────────────────────────────────────────────────────────

export type CustomerAppointmentRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  serviceName: string;
  servicePriceCents: number;
  professionalName: string;
};

export async function listCustomerAppointments(
  organizationId: string,
  userId: string,
  limit = 50,
): Promise<CustomerAppointmentRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.appointment.findMany({
      where: { userId },
      orderBy: { startsAt: "desc" },
      take: limit,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        service: { select: { name: true, priceCents: true } },
        professional: { select: { name: true } },
      },
    });
    return rows.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      serviceName: a.service.name,
      servicePriceCents: a.service.priceCents,
      professionalName: a.professional.name,
    }));
  });
}
