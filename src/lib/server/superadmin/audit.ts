import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

import { prismaAdmin } from "@/lib/db";

/**
 * PBI-55: log de TODA ação executada em /superadmin/*.
 *
 * Chamar SEMPRE dentro de uma Server Action ou route handler antes ou depois
 * do efeito colateral. Se der throw entre a mutação e o log, tudo bem — o
 * cliente vê erro, e adicionamos retry manual depois. O importante é que
 * o caminho feliz sempre loga.
 */
export async function logAdminAction(params: {
  actorUserId: string;
  action: string;
  targetOrgId?: string | null;
  diff?: Record<string, unknown> | null;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;

  await prismaAdmin.adminAuditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      targetOrgId: params.targetOrgId ?? null,
      // Record<string, unknown> não é atribuível a InputJsonValue (limitação
      // do typing do Prisma pra campos Json); o dado é sempre serializável.
      diff: (params.diff ?? undefined) as Prisma.InputJsonValue | undefined,
      ip,
      userAgent,
    },
  });
}
