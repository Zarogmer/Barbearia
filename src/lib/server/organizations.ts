import "server-only";

import { Prisma } from "@prisma/client";

import { prismaAdmin, withTenant } from "@/lib/db";
import {
  parseBusinessHours,
  type BusinessHours,
} from "@/lib/server/business-hours";
import type { UpdateOrganizationInput } from "@/lib/validators/organization";

export type AdminOrganization = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  allowGuestBooking: boolean;
  coverImageUrl: string | null;
  tagline: string | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
  businessHours: BusinessHours | null;
  reminderTemplate: string | null;
  allowMultipleSimultaneousBookings: boolean;
  allowOverbookEncaixe: boolean;
  creditCardFeeBp: number;
  debitCardFeeBp: number;
  loyaltyEnabled: boolean;
  loyaltyGoal: number;
  loyaltyRewardLabel: string | null;
};

/**
 * Carrega org do owner. RLS é redundante aqui (só consulta a própria org),
 * mas withTenant mantém o padrão e centraliza o contexto.
 */
export async function getOrganizationForAdmin(
  organizationId: string,
): Promise<AdminOrganization> {
  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
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
        reminderTemplate: true,
        allowMultipleSimultaneousBookings: true,
        allowOverbookEncaixe: true,
        creditCardFeeBp: true,
        debitCardFeeBp: true,
        loyaltyEnabled: true,
        loyaltyGoal: true,
        loyaltyRewardLabel: true,
      },
    });
    return {
      ...org,
      businessHours: parseBusinessHours(org.businessHours),
    };
  });
}

export class OrganizationError extends Error {
  constructor(
    message: string,
    public code: "SLUG_TAKEN" | "VALIDATION" | "UNKNOWN",
  ) {
    super(message);
    this.name = "OrganizationError";
  }
}

/**
 * Atualiza dados da org. Slug é unique global — usa prismaAdmin pra checar
 * disponibilidade (RLS limitaria a só ver a própria org). Captura
 * P2002 do INSERT/UPDATE como backstop.
 */
export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<AdminOrganization> {
  // Pre-check de slug: rápido, evita exception em P2002 no caminho feliz.
  const conflict = await prismaAdmin.organization.findFirst({
    where: {
      slug: input.slug,
      NOT: { id: organizationId },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new OrganizationError(
      `Já existe outra barbearia com o slug "${input.slug}".`,
      "SLUG_TAKEN",
    );
  }

  return withTenant(organizationId, async (db) => {
    try {
      const org = await db.organization.update({
        where: { id: organizationId },
        data: {
          name: input.name,
          slug: input.slug,
          allowGuestBooking: input.allowGuestBooking,
          allowMultipleSimultaneousBookings:
            input.allowMultipleSimultaneousBookings ?? false,
          allowOverbookEncaixe: input.allowOverbookEncaixe ?? true,
          creditCardFeeBp: input.creditCardFeeBp ?? 0,
          debitCardFeeBp: input.debitCardFeeBp ?? 0,
          loyaltyEnabled: input.loyaltyEnabled ?? false,
          loyaltyGoal: input.loyaltyGoal ?? 10,
          loyaltyRewardLabel: input.loyaltyRewardLabel ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          tagline: input.tagline ?? null,
          address: input.address ?? null,
          instagram: input.instagram ?? null,
          whatsapp: input.whatsapp ?? null,
          businessHours:
            input.businessHours === undefined
              ? undefined
              : (input.businessHours as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
        },
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
          reminderTemplate: true,
          allowMultipleSimultaneousBookings: true,
          allowOverbookEncaixe: true,
          creditCardFeeBp: true,
          debitCardFeeBp: true,
          loyaltyEnabled: true,
          loyaltyGoal: true,
          loyaltyRewardLabel: true,
        },
      });
      return {
        ...org,
        businessHours: parseBusinessHours(org.businessHours),
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new OrganizationError(
          `Slug "${input.slug}" já está em uso.`,
          "SLUG_TAKEN",
        );
      }
      throw err;
    }
  });
}
