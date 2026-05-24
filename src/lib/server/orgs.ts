import "server-only";

import { prismaAdmin } from "@/lib/db";

export type PublicOrg = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  allowGuestBooking: boolean;
};

/**
 * Resolve um slug público em Organization. Usa `prismaAdmin` (bypass RLS)
 * porque o lookup acontece ANTES do contexto tenant existir — é
 * exatamente o caso documentado em src/lib/db.ts.
 *
 * Retorna `null` se o slug não existir (rotas chamam notFound() na sequência).
 */
export async function getOrgBySlug(slug: string): Promise<PublicOrg | null> {
  const org = await prismaAdmin.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      allowGuestBooking: true,
    },
  });
  return org;
}
