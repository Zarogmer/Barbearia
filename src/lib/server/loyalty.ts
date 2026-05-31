import "server-only";

import { withTenant } from "@/lib/db";

/**
 * Cartão fidelidade (PBI-27).
 *
 * Stamps = COUNT(appointments WHERE status='COMPLETED' AND userId=?).
 * Sem tabela dedicada — conta direto. Quando atinge goal, cliente é
 * "elegível" pro reward. Admin marca redeem manualmente (no MVP) e zera
 * mentalmente ou ignora — UI continua mostrando count.
 *
 * Pra MVP: sem histórico de redeems. Fase 2 pode add `LoyaltyRedeem`
 * pra trackear quantas vezes resgatou e zerar contagem oficial.
 */

export type LoyaltyStatus = {
  enabled: boolean;
  count: number;
  goal: number;
  rewardLabel: string;
  /** count >= goal */
  eligible: boolean;
  /** 0..100 (% até goal). Cap 100. */
  progressPct: number;
  /** count restante (negativo se eligible) */
  remaining: number;
};

export async function getLoyaltyStatusForCustomer(
  organizationId: string,
  userId: string,
): Promise<LoyaltyStatus | null> {
  return withTenant(organizationId, async (db) => {
    const [org, count] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: {
          loyaltyEnabled: true,
          loyaltyGoal: true,
          loyaltyRewardLabel: true,
        },
      }),
      db.appointment.count({
        where: { userId, status: "COMPLETED" },
      }),
    ]);

    if (!org.loyaltyEnabled) {
      return {
        enabled: false,
        count,
        goal: org.loyaltyGoal,
        rewardLabel: org.loyaltyRewardLabel ?? "—",
        eligible: false,
        progressPct: 0,
        remaining: org.loyaltyGoal,
      };
    }

    const goal = org.loyaltyGoal;
    const eligible = count >= goal;
    const progressPct = Math.min(100, Math.round((count / goal) * 100));
    return {
      enabled: true,
      count,
      goal,
      rewardLabel: org.loyaltyRewardLabel ?? "Recompensa",
      eligible,
      progressPct,
      remaining: goal - count,
    };
  });
}

/**
 * Lista clientes elegíveis (count >= goal). Pra dashboard / atalho rápido
 * "quem ganhou o reward".
 */
export async function listLoyaltyEligible(
  organizationId: string,
  limit = 20,
): Promise<
  Array<{ userId: string; name: string; count: number }>
> {
  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { loyaltyEnabled: true, loyaltyGoal: true },
    });
    if (!org.loyaltyEnabled) return [];

    // Agrupa appointments COMPLETED por user (in-app — orgs pequenas)
    const rows = await db.appointment.findMany({
      where: { status: "COMPLETED", userId: { not: null } },
      select: { userId: true, user: { select: { name: true } } },
    });

    const byUser = new Map<string, { name: string; count: number }>();
    for (const r of rows) {
      if (!r.userId) continue;
      const cur = byUser.get(r.userId) ?? {
        name: r.user?.name ?? "?",
        count: 0,
      };
      cur.count += 1;
      byUser.set(r.userId, cur);
    }

    return Array.from(byUser.entries())
      .filter(([, v]) => v.count >= org.loyaltyGoal)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([userId, v]) => ({ userId, name: v.name, count: v.count }));
  });
}
