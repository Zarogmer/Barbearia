"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { logAdminAction } from "@/lib/server/superadmin/audit";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Sem permissao.");
  }
  return session.user;
}

const orgIdSchema = z.object({
  organizationId: z.string().uuid(),
});

const suspendSchema = orgIdSchema.extend({
  reason: z.string().min(3).max(500).optional(),
});

export async function suspendOrgAction(input: unknown) {
  const actor = await requireSuperAdmin();
  const { organizationId, reason } = suspendSchema.parse(input);

  const before = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { suspendedAt: true, name: true, slug: true },
  });
  if (!before) throw new Error("Loja nao encontrada.");
  if (before.suspendedAt) return; // idempotente

  const now = new Date();
  await prismaAdmin.organization.update({
    where: { id: organizationId },
    data: { suspendedAt: now },
  });
  await logAdminAction({
    actorUserId: actor.id,
    action: "org.suspend",
    targetOrgId: organizationId,
    diff: {
      before: { suspendedAt: null },
      after: { suspendedAt: now.toISOString(), reason: reason ?? null },
      org: { name: before.name, slug: before.slug },
    },
  });
  revalidatePath("/superadmin/lojas");
  revalidatePath("/superadmin/dashboard");
}

export async function reactivateOrgAction(input: unknown) {
  const actor = await requireSuperAdmin();
  const { organizationId } = orgIdSchema.parse(input);

  const before = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { suspendedAt: true, name: true, slug: true },
  });
  if (!before) throw new Error("Loja nao encontrada.");
  if (!before.suspendedAt) return;

  await prismaAdmin.organization.update({
    where: { id: organizationId },
    data: { suspendedAt: null },
  });
  await logAdminAction({
    actorUserId: actor.id,
    action: "org.reactivate",
    targetOrgId: organizationId,
    diff: {
      before: { suspendedAt: before.suspendedAt.toISOString() },
      after: { suspendedAt: null },
      org: { name: before.name, slug: before.slug },
    },
  });
  revalidatePath("/superadmin/lojas");
  revalidatePath("/superadmin/dashboard");
}

const scheduleDeletionSchema = orgIdSchema.extend({
  daysUntilDelete: z.number().int().min(1).max(90).default(30),
});

export async function scheduleOrgDeletionAction(input: unknown) {
  const actor = await requireSuperAdmin();
  const { organizationId, daysUntilDelete } = scheduleDeletionSchema.parse(input);

  const before = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { deletionScheduledFor: true, name: true, slug: true },
  });
  if (!before) throw new Error("Loja nao encontrada.");

  const scheduledFor = new Date(Date.now() + daysUntilDelete * 24 * 60 * 60 * 1000);
  await prismaAdmin.organization.update({
    where: { id: organizationId },
    data: { deletionScheduledFor: scheduledFor },
  });
  await logAdminAction({
    actorUserId: actor.id,
    action: "org.delete.schedule",
    targetOrgId: organizationId,
    diff: {
      before: {
        deletionScheduledFor: before.deletionScheduledFor?.toISOString() ?? null,
      },
      after: { deletionScheduledFor: scheduledFor.toISOString() },
      org: { name: before.name, slug: before.slug },
    },
  });
  revalidatePath("/superadmin/lojas");
}

export async function cancelOrgDeletionAction(input: unknown) {
  const actor = await requireSuperAdmin();
  const { organizationId } = orgIdSchema.parse(input);

  const before = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: { deletionScheduledFor: true, name: true, slug: true },
  });
  if (!before?.deletionScheduledFor) return;

  await prismaAdmin.organization.update({
    where: { id: organizationId },
    data: { deletionScheduledFor: null },
  });
  await logAdminAction({
    actorUserId: actor.id,
    action: "org.delete.cancel",
    targetOrgId: organizationId,
    diff: {
      before: {
        deletionScheduledFor: before.deletionScheduledFor.toISOString(),
      },
      after: { deletionScheduledFor: null },
      org: { name: before.name, slug: before.slug },
    },
  });
  revalidatePath("/superadmin/lojas");
}
