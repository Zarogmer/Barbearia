import { prismaAdmin } from "@/lib/db";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

function planLabel(status: string | null, trialEndsAt: Date | null) {
  if (status === "active") return { label: "Ativa", cls: "text-emerald-600" };
  if (status === "past_due") return { label: "Atraso", cls: "text-orange-600" };
  if (status === "canceled") return { label: "Cancelada", cls: "text-red-600" };
  if (status === "trialing") return { label: "Em trial (Stripe)", cls: "text-blue-600" };
  if (trialEndsAt && trialEndsAt.getTime() > Date.now())
    return { label: "Trial implícito", cls: "text-blue-600" };
  return { label: "Sem billing", cls: "text-subtle" };
}

export default async function SuperAdminFaturamentoPage() {
  const orgs = await prismaAdmin.organization.findMany({
    where: {
      OR: [
        { stripeCustomerId: { not: null } },
        { subscriptionStatus: { not: null } },
        { trialEndsAt: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
    },
    orderBy: [{ subscriptionStatus: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  const activeCount = orgs.filter((o) => o.subscriptionStatus === "active").length;
  const pastDueCount = orgs.filter((o) => o.subscriptionStatus === "past_due").length;
  const trialCount = orgs.filter(
    (o) =>
      o.subscriptionStatus === "trialing" ||
      (o.trialEndsAt && o.trialEndsAt.getTime() > Date.now() && !o.subscriptionStatus),
  ).length;
  const mrrCents = activeCount * 4900;

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <header>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Faturamento</h1>
        <p className="mt-1 text-sm text-subtle">Assinaturas Stripe e trials ativos.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-xs uppercase tracking-wider text-subtle">MRR</div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-600">
            {formatBRL(mrrCents)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-xs uppercase tracking-wider text-subtle">Ativas</div>
          <div className="mt-1 font-display text-2xl font-bold">{activeCount}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-xs uppercase tracking-wider text-subtle">Inadimplentes</div>
          <div className="mt-1 font-display text-2xl font-bold text-orange-600">{pastDueCount}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-xs uppercase tracking-wider text-subtle">Em trial</div>
          <div className="mt-1 font-display text-2xl font-bold text-blue-600">{trialCount}</div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left">
            <tr className="text-[10px] uppercase tracking-wider text-subtle">
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Customer Stripe</th>
              <th className="px-4 py-3">Fim do trial</th>
              <th className="px-4 py-3">Assinada em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orgs.map((o) => {
              const plan = planLabel(o.subscriptionStatus, o.trialEndsAt);
              return (
                <tr key={o.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.name}</div>
                    <div className="mono text-[10px] text-subtle">/{o.slug}</div>
                  </td>
                  <td className={`px-4 py-3 font-medium ${plan.cls}`}>{plan.label}</td>
                  <td className="mono px-4 py-3 text-xs text-subtle">
                    {o.stripeCustomerId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-subtle">
                    {o.trialEndsAt ? o.trialEndsAt.toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-subtle">
                    {o.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              );
            })}
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-subtle">
                  Nenhuma assinatura ou trial ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
