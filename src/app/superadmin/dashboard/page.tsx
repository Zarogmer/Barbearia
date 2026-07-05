import { Ban, Calendar, DollarSign, Store, TrendingDown, TrendingUp, UserPlus } from "lucide-react";

import { getGlobalMetrics } from "@/lib/server/superadmin/orgs";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneCls =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-subtle">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${toneCls}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-subtle">{sub}</div> : null}
    </div>
  );
}

export default async function SuperAdminDashboardPage() {
  const m = await getGlobalMetrics();

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <header>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Panorama geral</h1>
        <p className="mt-1 text-sm text-subtle">
          Números globais do SaaS. Atualizado a cada request.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label="MRR"
          value={formatBRL(m.mrrCents)}
          sub={`${m.activeSubs} assinatura(s) ativa(s)`}
          tone="positive"
        />
        <MetricCard
          icon={TrendingUp}
          label="ARR"
          value={formatBRL(m.arrCents)}
          sub="Projeção anual"
        />
        <MetricCard
          icon={Store}
          label="Lojas ativas"
          value={String(m.activeOrgs)}
          sub={`de ${m.totalOrgs} totais`}
        />
        <MetricCard
          icon={UserPlus}
          label="Novas (30d)"
          value={String(m.newOrgs30d)}
          sub="Signups últimos 30 dias"
          tone="positive"
        />
        <MetricCard
          icon={Calendar}
          label="Agend. hoje"
          value={String(m.apptsToday)}
          sub="Confirmados + concluídos"
        />
        <MetricCard
          icon={TrendingUp}
          label="Em trial"
          value={String(m.trialingOrgs)}
          sub="Aguardando conversão"
        />
        <MetricCard
          icon={TrendingDown}
          label="Churn (30d)"
          value={String(m.canceledLast30d)}
          sub="Assinaturas canceladas"
          tone={m.canceledLast30d > 0 ? "negative" : "default"}
        />
        <MetricCard
          icon={Ban}
          label="Suspensas"
          value={String(m.totalOrgs - m.activeOrgs)}
          sub="Bloqueadas ou excluindo"
        />
      </section>
    </div>
  );
}
