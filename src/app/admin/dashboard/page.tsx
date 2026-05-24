import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/server/dashboard";
import { formatBRL, formatDuration } from "@/lib/utils";

function formatTimeIn(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/dashboard");

  const membership = session.user.memberships[0];
  if (!membership) {
    return (
      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você não pertence a nenhuma organização.
        </p>
      </div>
    );
  }

  const stats = await getDashboardStats(membership.organizationId);

  const todayLocal = toZonedTime(new Date(), stats.timezone);
  const todayLabel = todayLocal.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: stats.timezone,
  });

  const occupancyTone: KpiTone =
    stats.occupancyPercent >= 80
      ? "warn"
      : stats.occupancyPercent >= 50
        ? "ok"
        : "brand";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-3">Painel · hoje</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight capitalize md:text-3xl">
            {todayLabel}
          </h1>
          <p className="text-sm text-subtle">Visão geral do dia.</p>
        </div>
        <Link
          href="/admin/agenda"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Novo agendamento
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Agendamentos hoje"
          value={String(stats.todayCount)}
          bar={{
            pct: stats.todayCount > 0 ? Math.min(100, stats.todayCount * 10) : 0,
            tone: "brand",
          }}
          footnote={`${stats.todayCount} confirmado${stats.todayCount !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Faturamento estimado"
          value={formatBRL(stats.estimatedRevenueCents)}
          bar={{
            pct: stats.estimatedRevenueCents > 0
              ? Math.min(100, Math.round((stats.estimatedRevenueCents / 120_000) * 100))
              : 0,
            tone: "ok",
          }}
          footnote={
            stats.estimatedRevenueCents === 0
              ? "sem agendamentos hoje"
              : "se todos comparecerem"
          }
        />
        <KpiCard
          label="Ocupação"
          value={`${stats.occupancyPercent}%`}
          bar={{ pct: stats.occupancyPercent, tone: occupancyTone }}
          footnote="das horas de trabalho do dia"
        />
        <KpiCard
          label="No-shows (7d)"
          value={String(stats.noShowCount7d)}
          bar={{
            pct: stats.noShowCount7d > 0 ? Math.min(100, stats.noShowCount7d * 20) : 0,
            tone: stats.noShowCount7d > 3 ? "danger" : "warn",
          }}
          footnote={stats.noShowCount7d === 0 ? "limpo essa semana" : "últimos 7 dias"}
        />
      </div>

      {/* Próximos agendamentos */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-sm font-bold">Próximos agendamentos</h2>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 mono text-[10px] font-semibold text-brand">
              {stats.upcomingAppointments.length}
            </span>
          </div>
          <Link
            href="/admin/agenda"
            className="text-xs text-subtle transition-colors hover:text-ink"
          >
            Ver agenda completa →
          </Link>
        </div>
        {stats.upcomingAppointments.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-display text-sm font-bold">Nenhum agendamento futuro hoje</p>
            <p className="mt-1 mono text-[10px] uppercase tracking-wider text-subtle">
              dia tranquilo · ou ja terminou
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {stats.upcomingAppointments.map((a) => {
              const profInitials = a.professionalName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[64px_1fr_140px_120px] items-center gap-3 px-4 py-3 sm:grid-cols-[80px_1fr_1fr_160px_100px]"
                >
                  <div className="mono text-xs font-semibold">
                    {formatTimeIn(a.startsAt, stats.timezone)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.customerName}</div>
                    <div className="mono truncate text-[11px] text-subtle">
                      #{a.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <div className="truncate text-sm font-medium">{a.serviceName}</div>
                    <div className="mono truncate text-[11px] text-subtle">
                      {formatDuration(a.serviceDurationMinutes)} ·{" "}
                      {formatBRL(a.servicePriceCents)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="avatar-ring">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold">
                        {profInitials}
                      </span>
                    </span>
                    <span className="truncate text-xs">
                      {a.professionalName.split(" ")[0]}
                    </span>
                  </div>
                  <span className="rounded-full bg-ok/10 px-2 py-0.5 text-center text-[10px] font-semibold text-ok">
                    Confirmado
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type KpiTone = "brand" | "ok" | "warn" | "danger";

function KpiCard({
  label,
  value,
  bar,
  footnote,
}: {
  label: string;
  value: string;
  bar: { pct: number; tone: KpiTone };
  footnote: string;
}) {
  const barClass =
    bar.tone === "ok"
      ? "bg-ok"
      : bar.tone === "warn"
        ? "bg-warn"
        : bar.tone === "danger"
          ? "bg-danger"
          : "bg-brand";

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="mono mb-1 text-[10px] uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="num font-display text-3xl font-extrabold">{value}</span>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={barClass} style={{ width: `${bar.pct}%` }} />
      </div>
      <div className="mono mt-1 text-[10px] text-subtle">{footnote}</div>
    </div>
  );
}
