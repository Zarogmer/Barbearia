import "server-only";

import { withTenant } from "@/lib/db";

export type PublicProfessional = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
};

/**
 * Lista profissionais ativos da org. Usado na landing pública (W-01).
 */
export async function listActiveProfessionals(
  organizationId: string,
): Promise<PublicProfessional[]> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, bio: true, photoUrl: true },
    });
  });
}

/**
 * Lista profissionais ativos que executam um serviço específico (W-03).
 */
export async function listProfessionalsForService(
  organizationId: string,
  serviceId: string,
): Promise<PublicProfessional[]> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findMany({
      where: {
        active: true,
        professionalServices: { some: { serviceId } },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, bio: true, photoUrl: true },
    });
  });
}

export async function getProfessionalById(
  organizationId: string,
  professionalId: string,
): Promise<PublicProfessional | null> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, name: true, bio: true, photoUrl: true },
    });
  });
}
