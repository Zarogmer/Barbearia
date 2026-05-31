import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Trophy, Users } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import {
  getPerformanceReport,
  type ProfessionalPerformance,
} from "@/lib/server/performance";
import { cn, formatBRL, formatDuration } from "@/lib/utils";

type SearchParams = {
  range?: "7d" | "30d" | "90d";
};

function resolveRange(sp: SearchParams) {
  const days = sp.range === "90d" ? 90 : sp.range === "7d" ? 7 : 30;
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  return {
    start,
    end,
    label:
      days === 7
        ? "Últimos 7 dias"
        : days === 30
          ? "Últimos 30 dias"
          : "Últimos 90 dias",
  };
}

function rangeHref(range: SearchParams["range"]): string {
  return `/admin/relatorios/profissionais?range=${range ?? "30d"}`;
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/relatorios/profissionais");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode ver performance da equipe.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const range = resolveRange(sp);
  const report = await getPerformanceReport(owner.organizationId, range);

  // Ranking: ordena por receita bruta DESC (só ativos com atendimento)
  const ranked = [...report.byProfessional]
    .filter((p) => p.attendances > 0)
    .sort((a, b) => b.grossRevenueCents - a.grossRevenueCents);
  const inactive = report.byProfessional.filter((p) => p.attendances === 0);
  const topRevenue = ranked[0]?.grossRevenueCents ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <Link
        href="/admin/relatorios"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para relatórios
      </Link>

      <header>
        <div className="eyebrow mb-3">Equipe</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Performance por profissional
        </h1>
        <p className="text-sm text-subtle">{range.label}</p>
      </header>

      <div className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1 w-fit">
        {(["7d", "30d", "90d"] as const).map((r) => (
          <Link
            key={r}
            href={rangeHref(r)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              (sp.range ?? "30d") === r
                ? "bg-surface text-ink shadow-sm"
                : "text-subtle hover:text-ink",
            )}
          >
            {r === "7d" ? "7 dias" : r === "30d" ? "30 dias" : "90 dias"}
          </Link>
        ))}
      </div>

      {/* Card da Empresa (total) */}
      <section className="rounded-md border border-brand/30 bg-gradient-to-br from-brand-soft/40 via-surface to-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-fg">
            <Users className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-display text-sm font-bold">Empresa (total)</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Atendimentos" value={String(report.company.attendances)} />
          <Stat label="Clientes únicos" value={String(report.company.uniqueCustomers)} />
          <Stat
            label="Horas trabalhadas"
            value={formatDuration(report.company.workedMinutes)}
          />
          <Stat
            label="Receita bruta"
            value={formatBRL(report.company.grossRevenueCents)}
          />
          <Stat
            label="Receita líquida"
            value={formatBRL(report.company.netRevenueCents)}
            hint="bruto - custos de serviço"
          />
          <Stat
            label="Ticket médio"
            value={formatBRL(report.company.averageTicketCents)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3 text-xs text-subtle">
          <span>
            Esperado futuro:{" "}
            <strong className="mono text-ink">
              {formatBRL(report.company.expectedRevenueCents)}
            </strong>
          </span>
          <span>
            No-shows:{" "}
            <strong
              className={cn(
                "mono",
                report.company.noShowRate > 10 ? "text-danger" : "text-warn",
              )}
            >
              {report.company.noShowCount} ({report.company.noShowRate}%)
            </strong>
          </span>
          <span>
            Cancelados:{" "}
            <strong className="mono text-ink">
              {report.company.cancelCount}
            </strong>
          </span>
        </div>
      </section>

      {/* Ranking por profissional */}
      {ranked.length === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Sem atendimentos no período"
          description="Marque agendamentos como Pagos na agenda pra começar a registrar performance."
          cta={{ href: "/admin/agenda", label: "Ir para agenda" }}
        />
      ) : (
        <section className="space-y-3">
          <h2 className="font-display text-base font-bold">
            Ranking por receita
          </h2>
          {ranked.map((p, idx) => (
            <ProfCard
              key={p.professionalId}
              prof={p}
              position={idx + 1}
              topRevenue={topRevenue}
            />
          ))}
        </section>
      )}

      {inactive.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
            Sem atendimento no período ({inactive.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {inactive.map((p) => (
              <li
                key={p.professionalId}
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-subtle"
              >
                {p.professionalName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="num font-display text-lg font-extrabold">{value}</div>
      {hint && <div className="text-[10px] text-subtle">{hint}</div>}
    </div>
  );
}

function ProfCard({
  prof,
  position,
  topRevenue,
}: {
  prof: ProfessionalPerformance;
  position: number;
  topRevenue: number;
}) {
  const initials = prof.professionalName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const barPct = topRevenue > 0 ? (prof.grossRevenueCents / topRevenue) * 100 : 0;
  const isTop = position === 1;

  return (
    <div
      className={cn(
        "rounded-md border bg-surface p-4 transition-colors",
        isTop
          ? "border-brand/50 shadow-[0_0_0_4px_hsl(var(--brand)/0.08)]"
          : "border-line",
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md mono text-xs font-bold",
            isTop ? "bg-brand text-brand-fg" : "bg-surface-2 text-subtle",
          )}
        >
          {isTop ? <Trophy className="h-4 w-4" /> : `#${position}`}
        </span>
        <span className="avatar-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold">
            {initials}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">
            {prof.professionalName}
            {!prof.active && (
              <span className="ml-2 mono text-[10px] uppercase tracking-wider text-subtle">
                inativo
              </span>
            )}
          </div>
          <div className="mono text-[10px] text-subtle">
            {prof.attendances} atend. · {prof.uniqueCustomers} clientes ·{" "}
            {formatDuration(prof.workedMinutes)}
          </div>
        </div>
        <div className="text-right">
          <div className="num font-display text-lg font-extrabold">
            {formatBRL(prof.grossRevenueCents)}
          </div>
          <div className="mono text-[10px] text-subtle">
            ticket {formatBRL(prof.averageTicketCents)}
          </div>
        </div>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={isTop ? "h-full bg-brand" : "h-full bg-subtle/40"}
          style={{ width: `${barPct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <MiniStat label="Líquido" value={formatBRL(prof.netRevenueCents)} />
        <MiniStat
          label="Esperado"
          value={formatBRL(prof.expectedRevenueCents)}
          tone="subtle"
        />
        <MiniStat
          label="No-shows"
          value={`${prof.noShowCount} (${prof.noShowRate}%)`}
          tone={prof.noShowRate > 10 ? "danger" : "warn"}
        />
        <MiniStat
          label="Cancelados"
          value={String(prof.cancelCount)}
          tone="subtle"
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "subtle" | "warn" | "danger";
}) {
  return (
    <div className="rounded-md bg-surface-2 px-2.5 py-1.5">
      <div className="mono text-[9px] uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div
        className={cn(
          "mono text-xs font-bold",
          tone === "warn" && "text-warn",
          tone === "danger" && "text-danger",
          tone === "subtle" && "text-subtle",
        )}
      >
        {value}
      </div>
    </div>
  );
}
