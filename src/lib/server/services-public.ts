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
      where: { active: true },
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
      where: { id: serviceId, active: true },
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
