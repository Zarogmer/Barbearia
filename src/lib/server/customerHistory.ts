import "server-only";

import { withTenant } from "@/lib/db";
import { listReviewsByAppointmentIds, type ReviewSummary } from "./reviews";

export type CustomerHistoryAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
  professionalName: string;
  review: ReviewSummary | null;
};

export type CustomerHistory = {
  upcoming: CustomerHistoryAppointment[];
  byMonth: { yearMonth: string; label: string; items: CustomerHistoryAppointment[] }[];
  total: number;
};

/**
 * Lista agendamentos do cliente logado naquela barbearia.
 * Separa em:
 *  - upcoming: CONFIRMED com startsAt >= now (ordem cresc)
 *  - byMonth: tudo o resto (COMPLETED, CANCELLED, NO_SHOW + CONFIRMED passados)
 *    agrupado por ano-mês, desc dentro do grupo
 *
 * Anexa review (se existir) em cada item. Usado em
 * /[orgSlug]/conta/historico (PBI-48 Fases 4 e 5).
 */
export async function getCustomerHistory(
  organizationId: string,
  userId: string,
): Promise<CustomerHistory> {
  const rows = await withTenant(organizationId, async (db) => {
    return db.appointment.findMany({
      where: { userId },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        service: { select: { name: true, durationMinutes: true, priceCents: true } },
        professional: { select: { name: true } },
      },
    });
  });

  const reviewsByApptId = await listReviewsByAppointmentIds(
    organizationId,
    rows.map((r) => r.id),
  );

  const now = new Date();
  const upcoming: CustomerHistoryAppointment[] = [];
  const past: CustomerHistoryAppointment[] = [];

  for (const a of rows) {
    const item: CustomerHistoryAppointment = {
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      serviceName: a.service.name,
      serviceDurationMinutes: a.service.durationMinutes,
      servicePriceCents: a.service.priceCents,
      professionalName: a.professional.name,
      review: reviewsByApptId.get(a.id) ?? null,
    };
    if (a.status === "CONFIRMED" && a.startsAt > now) upcoming.push(item);
    else past.push(item);
  }

  upcoming.sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime());

  // Agrupa passados por YYYY-MM
  const groups = new Map<string, CustomerHistoryAppointment[]>();
  for (const item of past) {
    const d = item.startsAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }

  const byMonth = Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([yearMonth, items]) => {
      const [y, m] = yearMonth.split("-").map(Number);
      const label = new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      return { yearMonth, label, items };
    });

  return { upcoming, byMonth, total: rows.length };
}
