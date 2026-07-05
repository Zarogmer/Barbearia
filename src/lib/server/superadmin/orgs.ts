import "server-only";

import { prismaAdmin } from "@/lib/db";

export type OrgFilter =
  | "all"
  | "active"
  | "suspended"
  | "trialing"
  | "canceled"
  | "deleting";

export interface OrgListRow {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  servicesCount: number;
  appointmentsToday: number;
  appointmentsLast30d: number;
  clientsCount: number;
  revenueMonthCents: number;
  plan: "trialing" | "active" | "past_due" | "canceled" | "none";
  status: "active" | "suspended" | "deleting";
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
  deletionScheduledFor: Date | null;
  createdAt: Date;
}

function derivePlan(
  subscriptionStatus: string | null,
  trialEndsAt: Date | null,
): OrgListRow["plan"] {
  if (subscriptionStatus === "active") return "active";
  if (subscriptionStatus === "past_due") return "past_due";
  if (subscriptionStatus === "canceled") return "canceled";
  if (subscriptionStatus === "trialing") return "trialing";
  if (trialEndsAt && trialEndsAt.getTime() > Date.now()) return "trialing";
  return "none";
}

function deriveStatus(row: {
  suspendedAt: Date | null;
  deletionScheduledFor: Date | null;
}): OrgListRow["status"] {
  if (row.deletionScheduledFor) return "deleting";
  if (row.suspendedAt) return "suspended";
  return "active";
}

/**
 * PBI-55: lista todas as orgs com métricas agregadas pra tabela principal
 * de /superadmin/lojas. Uma query base + agregados via groupBy pra evitar
 * N+1. Em produção com muitas orgs (>1000), migrar pra view materializada.
 */
export async function listOrgsForSuperAdmin(params: {
  filter?: OrgFilter;
  search?: string;
  limit?: number;
}): Promise<OrgListRow[]> {
  const { filter = "all", search, limit = 100 } = params;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const orgs = await prismaAdmin.organization.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      suspendedAt: true,
      deletionScheduledFor: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);

  // Owner emails via memberships OWNER.
  const owners = await prismaAdmin.membership.findMany({
    where: { organizationId: { in: orgIds }, role: "OWNER" },
    select: {
      organizationId: true,
      user: { select: { email: true, name: true } },
    },
  });
  const ownerByOrg = new Map<string, { email: string; name: string }>();
  for (const o of owners) {
    if (!ownerByOrg.has(o.organizationId)) {
      ownerByOrg.set(o.organizationId, {
        email: o.user.email,
        name: o.user.name,
      });
    }
  }

  const [servicesCounts, apptsToday, appts30d, clientsCounts, revenueMonth] =
    await Promise.all([
      prismaAdmin.service.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds }, active: true },
        _count: { _all: true },
      }),
      prismaAdmin.appointment.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: orgIds },
          startsAt: { gte: startOfDay },
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
        _count: { _all: true },
      }),
      prismaAdmin.appointment.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: orgIds },
          startsAt: { gte: startOf30d },
        },
        _count: { _all: true },
      }),
      prismaAdmin.customerOrg.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds } },
        _count: { _all: true },
      }),
      prismaAdmin.comandaPayment.groupBy({
        by: ["comandaId"],
        where: {
          paidAt: { gte: startOfMonth },
          comanda: {
            organizationId: { in: orgIds },
            status: "CLOSED",
          },
        },
        _sum: { amountCents: true },
      }),
    ]);

  // ComandaPayment groupBy é por comandaId. Preciso reagrupar por orgId.
  // Faço uma query extra bem barata pra mapear comandaId → orgId.
  const comandaIds = revenueMonth.map((r) => r.comandaId);
  const comandaOrgMap = new Map<string, string>();
  if (comandaIds.length) {
    const comandas = await prismaAdmin.comanda.findMany({
      where: { id: { in: comandaIds } },
      select: { id: true, organizationId: true },
    });
    for (const c of comandas) comandaOrgMap.set(c.id, c.organizationId);
  }

  const revenueByOrg = new Map<string, number>();
  for (const r of revenueMonth) {
    const orgId = comandaOrgMap.get(r.comandaId);
    if (!orgId) continue;
    revenueByOrg.set(
      orgId,
      (revenueByOrg.get(orgId) ?? 0) + (r._sum.amountCents ?? 0),
    );
  }

  const servicesByOrg = new Map(
    servicesCounts.map((s) => [s.organizationId, s._count._all]),
  );
  const apptsTodayByOrg = new Map(
    apptsToday.map((a) => [a.organizationId, a._count._all]),
  );
  const appts30dByOrg = new Map(
    appts30d.map((a) => [a.organizationId, a._count._all]),
  );
  const clientsByOrg = new Map(
    clientsCounts.map((c) => [c.organizationId, c._count._all]),
  );

  const rows: OrgListRow[] = orgs.map((o) => {
    const owner = ownerByOrg.get(o.id);
    return {
      id: o.id,
      slug: o.slug,
      name: o.name,
      address: o.address,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      servicesCount: servicesByOrg.get(o.id) ?? 0,
      appointmentsToday: apptsTodayByOrg.get(o.id) ?? 0,
      appointmentsLast30d: appts30dByOrg.get(o.id) ?? 0,
      clientsCount: clientsByOrg.get(o.id) ?? 0,
      revenueMonthCents: revenueByOrg.get(o.id) ?? 0,
      plan: derivePlan(o.subscriptionStatus, o.trialEndsAt),
      status: deriveStatus(o),
      trialEndsAt: o.trialEndsAt,
      suspendedAt: o.suspendedAt,
      deletionScheduledFor: o.deletionScheduledFor,
      createdAt: o.createdAt,
    };
  });

  // Filtro final aplicado em memória (derivado do plano/status). Poderia
  // virar SQL mas a lista já veio limitada.
  if (filter === "all") return rows;
  return rows.filter((r) => {
    switch (filter) {
      case "active":
        return r.status === "active";
      case "suspended":
        return r.status === "suspended";
      case "trialing":
        return r.plan === "trialing";
      case "canceled":
        return r.plan === "canceled";
      case "deleting":
        return r.status === "deleting";
    }
  });
}

/**
 * PBI-55: totalizadores globais pro dashboard super-admin.
 */
export async function getGlobalMetrics() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrgs,
    activeOrgs,
    trialingOrgs,
    activeSubs,
    canceledLast30d,
    newOrgs30d,
    apptsToday,
  ] = await Promise.all([
    prismaAdmin.organization.count(),
    prismaAdmin.organization.count({
      where: {
        suspendedAt: null,
        deletionScheduledFor: null,
      },
    }),
    prismaAdmin.organization.count({
      where: {
        OR: [
          { subscriptionStatus: "trialing" },
          { trialEndsAt: { gt: now }, subscriptionStatus: null },
        ],
      },
    }),
    prismaAdmin.organization.count({
      where: { subscriptionStatus: "active" },
    }),
    prismaAdmin.organization.count({
      where: {
        subscriptionStatus: "canceled",
        updatedAt: { gte: startOf30d },
      },
    }),
    prismaAdmin.organization.count({
      where: { createdAt: { gte: startOf30d } },
    }),
    prismaAdmin.appointment.count({
      where: {
        startsAt: { gte: startOfDay },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    }),
  ]);

  const mrrCents = activeSubs * 4900; // R$ 49/mês (PBI-52)
  const arrCents = mrrCents * 12;

  return {
    totalOrgs,
    activeOrgs,
    trialingOrgs,
    activeSubs,
    canceledLast30d,
    newOrgs30d,
    apptsToday,
    mrrCents,
    arrCents,
  };
}
