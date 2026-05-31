import "server-only";

import { withTenant } from "@/lib/db";

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

/**
 * Lista serviços ativos para exibição pública (landing + picker do fluxo
 * de agendamento). Filtra `active: true`. Ordena por preço crescente
 * — assumindo "barato primeiro" como heurística do MVP.
 *
 * Quando PBI-04 backend mergear, consolidar com listServices em
 * src/lib/server/services.ts (essa versão fica dedicada ao público).
 */
export async function listActiveServices(
  organizationId: string,
): Promise<PublicService[]> {
  return withTenant(organizationId, async (db) => {
    return db.service.findMany({
      // PBI-33: filtra allowOnlineBooking — só admin marca off-line
      where: { active: true, allowOnlineBooking: true },
      orderBy: [{ priceCents: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
      },
    });
  });
}

export async function getActiveServiceById(
  organizationId: string,
  serviceId: string,
): Promise<PublicService | null> {
  return withTenant(organizationId, async (db) => {
    return db.service.findFirst({
      // PBI-33: blocked se allowOnlineBooking=false (impede deep link público)
      where: { id: serviceId, active: true, allowOnlineBooking: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
      },
    });
  });
}
