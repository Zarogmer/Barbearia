import "server-only";

import { unstable_cache } from "next/cache";

import { prismaAdmin } from "@/lib/db";
import {
  parseBusinessHours,
  type BusinessHours,
} from "@/lib/server/business-hours";

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

export type PublicOrgProfile = PublicOrg & {
  coverImageUrl: string | null;
  tagline: string | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
  businessHours: BusinessHours | null;
  theme: string | null;
  darkMode: boolean;
};

/**
 * Vitrine pública (PBI-26): toda info do tenant em 1 query.
 * Cacheado por 60s — landing pública é rota quente compartilhada
 * por WhatsApp / Instagram. Edição via admin chama revalidatePath.
 */
export const getOrgPublicProfile = unstable_cache(
  async (slug: string): Promise<PublicOrgProfile | null> => {
    const org = await prismaAdmin.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        timezone: true,
        allowGuestBooking: true,
        coverImageUrl: true,
        tagline: true,
        address: true,
        instagram: true,
        whatsapp: true,
        businessHours: true,
        theme: true,
        darkMode: true,
      },
    });
    if (!org) return null;
    return {
      ...org,
      businessHours: parseBusinessHours(org.businessHours),
    };
  },
  ["org-public-profile-v2"],
  { revalidate: 60, tags: ["org-public-profile"] },
);
