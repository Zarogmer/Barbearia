import "server-only";

import { prismaAdmin } from "@/lib/db";

export type LapsedCustomerRow = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  lastVisitAt: Date;
  daysSince: number;
  completedCount: number;
  totalSpentCents: number;
};

export type LapsedCustomerSummary = {
  total: number;
  thresholdDays: number;
  items: LapsedCustomerRow[];
};

const DEFAULT_THRESHOLD_DAYS = 60;
const MAX_THRESHOLD_DAYS = 365;

/**
 * "Sumidos" = clientes com >=1 COMPLETED, último COMPLETED >= thresholdDays
 * atrás, e sem CONFIRMED futuro. Ordenado pelos mais antigos primeiro
 * (oportunidade maior de reengajar).
 *
 * Faz uma query global em users com filtro por appointments.some na org,
 * carrega COMPLETED + serviço (priceCents) e CONFIRMED futuro (1 row check).
 * Agrega in-memory — funciona bem pra escala de barbearia (centenas/milhares
 * de clientes por org).
 */
export async function listLapsedCustomers(
  organizationId: string,
  thresholdDaysRaw?: number,
): Promise<LapsedCustomerSummary> {
  const thresholdDays = Math.min(
    MAX_THRESHOLD_DAYS,
    Math.max(7, thresholdDaysRaw ?? DEFAULT_THRESHOLD_DAYS),
  );
  const now = new Date();
  const cutoff = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

  const rows = await prismaAdmin.user.findMany({
    where: {
      appointments: {
        some: { organizationId, status: "COMPLETED" },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      appointments: {
        where: { organizationId },
        select: {
          startsAt: true,
          status: true,
          service: { select: { priceCents: true } },
        },
      },
    },
  });

  const items: LapsedCustomerRow[] = [];
  for (const u of rows) {
    let lastVisitAt: Date | null = null;
    let completedCount = 0;
    let totalSpentCents = 0;
    let hasUpcoming = false;

    for (const a of u.appointments) {
      if (a.status === "COMPLETED") {
        completedCount += 1;
        totalSpentCents += a.service.priceCents;
        if (!lastVisitAt || a.startsAt > lastVisitAt) {
          lastVisitAt = a.startsAt;
        }
      } else if (a.status === "CONFIRMED" && a.startsAt > now) {
        hasUpcoming = true;
      }
    }

    if (!lastVisitAt || hasUpcoming) continue;
    if (lastVisitAt >= cutoff) continue;

    const daysSince = Math.floor(
      (now.getTime() - lastVisitAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    items.push({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      lastVisitAt,
      daysSince,
      completedCount,
      totalSpentCents,
    });
  }

  items.sort((a, b) => b.daysSince - a.daysSince);

  return { total: items.length, thresholdDays, items };
}

/**
 * Conta rápida pra badge no menu. Usa a mesma query — barbearias têm
 * volume baixo (~centenas de clientes), não compensa cache separado.
 */
export async function countLapsedCustomers(
  organizationId: string,
  thresholdDaysRaw?: number,
): Promise<number> {
  const { total } = await listLapsedCustomers(organizationId, thresholdDaysRaw);
  return total;
}
