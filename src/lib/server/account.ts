import "server-only";

import { prismaAdmin } from "@/lib/db";

/**
 * Exclusão de conta com grace de 30 dias (LGPD - PBI-54).
 *
 * Marca User e (se OWNER) a Organization com deletionScheduledFor. Login
 * fica bloqueado a partir daí, mas dados persistem por 30 dias caso o
 * usuário queira reativar.
 *
 * Após o prazo, cron limpa os registros definitivamente (TODO PBI futuro).
 */

const GRACE_DAYS = 30;

export type AccountDeletionResult =
  | { ok: true; scheduledFor: Date }
  | { ok: false; error: string };

export async function scheduleAccountDeletion(
  userId: string,
): Promise<AccountDeletionResult> {
  const user = await prismaAdmin.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      memberships: {
        where: { role: "OWNER" },
        select: { organizationId: true },
      },
    },
  });
  if (!user) return { ok: false, error: "Usuário não encontrado." };

  const scheduledFor = new Date(
    Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000,
  );

  await prismaAdmin.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { deletionScheduledFor: scheduledFor },
    });
    // Se é OWNER de orgs, agenda exclusão delas também.
    for (const m of user.memberships) {
      await tx.organization.update({
        where: { id: m.organizationId },
        data: { deletionScheduledFor: scheduledFor },
      });
    }
  });

  return { ok: true, scheduledFor };
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  const user = await prismaAdmin.user.findUnique({
    where: { id: userId },
    select: {
      memberships: {
        where: { role: "OWNER" },
        select: { organizationId: true },
      },
    },
  });
  if (!user) return;

  await prismaAdmin.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { deletionScheduledFor: null },
    });
    for (const m of user.memberships) {
      await tx.organization.update({
        where: { id: m.organizationId },
        data: { deletionScheduledFor: null },
      });
    }
  });
}

/**
 * Exporta tudo da org num JSON serializável. Cumpre LGPD art. 18 (direito
 * à portabilidade). Tamanho: linear em #appointments + #comandas — orgs
 * típicas (centenas a milhares) cabem confortavelmente em memória.
 *
 * Não inclui hashes (senha, OTP) por questão de segurança.
 */
export type OrgExport = Record<string, unknown>;

export async function exportOrganizationData(
  organizationId: string,
): Promise<OrgExport> {
  const org = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    include: {
      services: true,
      professionals: { include: { workingHours: true, timeBlocks: true } },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              birthDate: true,
              createdAt: true,
              acceptedTermsAt: true,
            },
          },
        },
      },
      appointments: true,
      reviews: true,
      customerNotes: true,
      comandas: { include: { items: true, payments: true } },
      commissionRules: true,
      commissionPayments: true,
      products: true,
      inventoryMovements: true,
      customerOrgs: true,
      messageTemplates: true,
      packages: true,
      customerPackages: true,
      waitlistEntries: true,
      expenses: true,
      miscRevenues: true,
      customerPhotos: true,
      rooms: true,
    },
  });
  if (!org) {
    return { error: "Organization not found", organizationId };
  }
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    note: "LGPD art. 18 (portabilidade). Hashes de senha e OTP omitidos por segurança.",
    organization: org,
  };
}
