import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Calendar, CreditCard, TrendingUp, Users, XCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listProfessionalsAdmin } from "@/lib/server/professionals";
import { getFinancialReport } from "@/lib/server/reports";
import { cn, formatBRL } from "@/lib/utils";

type SearchParams = {
  range?: "7d" | "30d" | "90d" | "custom";
  start?: string; // YYYY-MM-DD
  end?: string;
  professionalId?: string;
};

const METHOD_LABEL = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  CORTESIA: "Cortesia",
} as const;

function resolvePeriod(sp: SearchParams): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  if (sp.range === "custom" && sp.start && sp.end) {
    return {
      start: new Date(`${sp.start}T00:00:00Z`),
      end: new Date(`${sp.end}T23:59:59Z`),
      label: `${sp.start} → ${sp.end}`,
    };
  }
  const days = sp.range === "90d" ? 90 : sp.range === "7d" ? 7 : 30;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  return {
    start,
    end,
    label:
      days === 7 ? "Últimos 7 dias" : days === 30 ? "Últimos 30 dias" : "Últimos 90 dias",
  };
}

function rangeHref(base: SearchParams, range: SearchParams["range"]): string {
  const params = new URLSearchParams();
  params.set("range", range ?? "30d");
  if (base.professionalId) params.set("professionalId", base.professionalId);
  return `/admin/relatorios?${params.toString()}`;
}

function profFilterHref(base: SearchParams, profId: string | null): string {
  const params = new URLSearchParams();
  params.set("range", base.range ?? "30d");
  if (profId) params.set("professionalId", profId);
  return `/admin/relatorios?${params.toString()}`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/relatorios");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Finanças</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Relatórios
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para ver relatórios.
        </div>
      </div>
    );
  }
  const orgId = owner.organizationId;

  const sp = await searchParams;
  const period = resolvePeriod(sp);
  const profId = sp.professionalId ?? null;

  const [report, professionals] = await Promise.all([
    getFinancialReport(orgId, period, profId),
    listProfessionalsAdmin(orgId),
  ]);

  const selectedProf = profId
    ? professionals.find((p) => p.id === profId)
    : null;

  const maxDayRevenue = Math.max(1, ...report.byDay.map((d) => d.revenueCents));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Finanças</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Relatórios
        </h1>
        <p className="text-sm text-subtle">
          {period.label}
          {selectedProf && (
            <>
              {" · "}
              <span className="font-medium text-ink">{selectedProf.name}</span>
            </>
          )}
        </p>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <Link
              key={r}
              href={rangeHref(sp, r)}
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

        <div className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
          <Link
            href={profFilterHref(sp, null)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              !profId
                ? "bg-surface text-ink shadow-sm"
                : "text-subtle hover:text-ink",
            )}
          >
            Todos
          </Link>
          {professionals.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              href={profFilterHref(sp, p.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                profId === p.id
                  ? "bg-surface text-ink shadow-sm"
                  : "text-subtle hover:text-ink",
              )}
            >
              {p.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      </div>

      {report.totalAttendances === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Sem dados no período"
          description="Não há comandas fechadas neste recorte. Mude o período acima ou abra/feche comandas pra começar a registrar faturamento."
          cta={{ href: "/admin/comandas", label: "Ir para comandas" }}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label="Faturamento"
              value={formatBRL(report.totalRevenueCents)}
              tone="ok"
            />
            <Kpi
              icon={<Users className="h-4 w-4" />}
              label="Atendimentos"
              value={String(report.totalAttendances)}
              tone="brand"
            />
            <Kpi
              icon={<BarChart3 className="h-4 w-4" />}
              label="Ticket médio"
              value={formatBRL(report.ticketAverageCents)}
              tone="brand"
            />
            <Kpi
              icon={<XCircle className="h-4 w-4" />}
              label="Cancel / No-show"
              value={`${report.cancelledCount} / ${report.noShowCount}`}
              tone={
                report.cancelledCount + report.noShowCount > 5 ? "warn" : "subtle"
              }
            />
          </div>

          {/* Gráfico por dia (barras CSS puro) */}
          {report.byDay.length > 1 && (
            <section className="rounded-md border border-line bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold">
                  Faturamento por dia
                </h2>
                <span className="mono text-[10px] text-subtle">
                  {report.byDay.length} dia{report.byDay.length !== 1 && "s"}
                </span>
              </div>
              <div className="flex h-32 items-end gap-1">
                {report.byDay.map((d) => {
                  const h = Math.max(2, (d.revenueCents / maxDayRevenue) * 100);
                  const day = d.date.slice(8, 10);
                  return (
                    <div
                      key={d.date}
                      className="group flex-1 min-w-[8px]"
                      title={`${d.date} · ${formatBRL(d.revenueCents)} · ${d.attendances} atend.`}
                    >
                      <div
                        className="w-full rounded-t bg-brand/70 transition-colors group-hover:bg-brand"
                        style={{ height: `${h}%` }}
                      />
                      <div className="mt-1 mono text-center text-[9px] text-subtle">
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tabela por profissional */}
          {!profId && report.byProfessional.length > 0 && (
            <section className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="border-b border-line bg-surface-2 px-5 py-3">
                <h2 className="font-display text-sm font-bold">
                  Por profissional
                </h2>
              </div>
              <div className="hidden border-b border-line px-5 py-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle sm:grid sm:grid-cols-[1fr_120px_120px_120px] sm:gap-4">
                <div>Profissional</div>
                <div className="text-right">Atendimentos</div>
                <div className="text-right">Ticket méd.</div>
                <div className="text-right">Faturamento</div>
              </div>
              <div className="divide-y divide-line">
                {report.byProfessional.map((p) => {
                  const sharePct = Math.round(
                    (p.revenueCents / report.totalRevenueCents) * 100,
                  );
                  return (
                    <div
                      key={p.professionalId}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_120px_120px_120px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {p.professionalName}
                        </div>
                        <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-surface-2 sm:hidden">
                          <div
                            className="bg-brand"
                            style={{ width: `${sharePct}%` }}
                          />
                        </div>
                        <div className="mono text-[10px] text-subtle sm:hidden">
                          {sharePct}% · {p.attendances} atend. ·{" "}
                          {formatBRL(p.ticketAverageCents)} ticket
                        </div>
                      </div>
                      <div className="hidden mono text-sm text-right sm:block">
                        {p.attendances}
                      </div>
                      <div className="hidden mono text-sm text-right sm:block">
                        {formatBRL(p.ticketAverageCents)}
                      </div>
                      <div className="mono text-sm font-semibold text-right">
                        {formatBRL(p.revenueCents)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Por método de pagamento */}
          {report.byPaymentMethod.length > 0 && (
            <section className="rounded-md border border-line bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-subtle" />
                <h2 className="font-display text-sm font-bold">
                  Por método de pagamento
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {report.byPaymentMethod.map((m) => (
                  <div
                    key={m.method}
                    className="rounded-md border border-line bg-surface-2/40 p-3"
                  >
                    <div className="mono text-[10px] uppercase tracking-wider text-subtle">
                      {METHOD_LABEL[m.method]}
                    </div>
                    <div className="mt-0.5 mono text-base font-bold">
                      {formatBRL(m.amountCents)}
                    </div>
                    <div className="mono text-[10px] text-subtle">
                      {m.count} transação{m.count !== 1 && "ões"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Footer: links rápidos */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/comandas?filter=CLOSED"
          className="tap inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-subtle transition-colors hover:border-brand hover:text-ink"
        >
          <Calendar className="h-3.5 w-3.5" />
          Comandas fechadas
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/admin/comissoes?tab=calcular"
          className="tap inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-subtle transition-colors hover:border-brand hover:text-ink"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Calcular comissões
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ok" | "brand" | "warn" | "subtle";
}) {
  const iconBg =
    tone === "ok"
      ? "bg-ok/10 text-ok"
      : tone === "warn"
        ? "bg-warn/15 text-warn"
        : tone === "subtle"
          ? "bg-surface-2 text-subtle"
          : "bg-brand-soft text-brand";
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md", iconBg)}>
          {icon}
        </span>
      </div>
      <div className="mono text-[10px] uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="num font-display text-2xl font-extrabold">{value}</div>
    </div>
  );
}
