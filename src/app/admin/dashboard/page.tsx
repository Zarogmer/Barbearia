import Link from "next/link";
import { Plus } from "lucide-react";

import {
  APPOINTMENTS,
  getProfessionalById,
  getServiceById,
} from "@/lib/mock-data";
import { formatBRL, formatDuration, formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const todayAppointments = APPOINTMENTS.filter((a) => a.status === "CONFIRMED");
  const estimatedRevenue = todayAppointments.reduce((acc, a) => {
    const svc = getServiceById(a.serviceId);
    return acc + (svc?.priceCents ?? 0);
  }, 0);

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-3">Painel · hoje</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
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
          value={String(todayAppointments.length)}
          delta="+20%"
          deltaTone="ok"
          bar={{ pct: 75, tone: "brand" }}
          footnote={`${todayAppointments.length} confirmados`}
        />
        <KpiCard
          label="Faturamento estimado"
          value={formatBRL(estimatedRevenue)}
          delta="+12%"
          deltaTone="ok"
          bar={{ pct: 60, tone: "ok" }}
          footnote="meta R$ 1.200"
        />
        <KpiCard
          label="Ocupação"
          value="62%"
          delta="+5%"
          deltaTone="warn"
          bar={{ pct: 62, tone: "warn" }}
          footnote="média mês: 58%"
        />
        <KpiCard
          label="No-shows (7d)"
          value="2"
          delta="-1"
          deltaTone="danger"
          bar={{ pct: 20, tone: "danger" }}
          footnote="mock — PBI-09"
        />
      </div>

      {/* Próximos agendamentos */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-sm font-bold">Próximos agendamentos</h2>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 mono text-[10px] font-semibold text-brand">
              {todayAppointments.length}
            </span>
          </div>
          <Link
            href="/admin/agenda"
            className="text-xs text-subtle transition-colors hover:text-ink"
          >
            Ver agenda completa →
          </Link>
        </div>
        <div className="divide-y divide-line">
          {todayAppointments.map((a) => {
            const svc = getServiceById(a.serviceId);
            const prof = getProfessionalById(a.professionalId);
            const profInitials = prof?.name
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
                <div className="mono text-xs font-semibold">{formatTime(a.startsAt)}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{a.customerName}</div>
                  <div className="mono truncate text-[11px] text-subtle">
                    cliente recorrente
                  </div>
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-sm font-medium">{svc?.name}</div>
                  <div className="mono truncate text-[11px] text-subtle">
                    {svc ? formatDuration(svc.durationMinutes) : "—"} ·{" "}
                    {svc ? formatBRL(svc.priceCents) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="avatar-ring">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold">
                      {profInitials ?? "?"}
                    </span>
                  </span>
                  <span className="truncate text-xs">{prof?.name.split(" ")[0]}</span>
                </div>
                <span className="rounded-full bg-ok/10 px-2 py-0.5 text-center text-[10px] font-semibold text-ok">
                  Confirmado
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type KpiTone = "brand" | "ok" | "warn" | "danger";

function KpiCard({
  label,
  value,
  delta,
  deltaTone,
  bar,
  footnote,
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone: KpiTone;
  bar: { pct: number; tone: KpiTone };
  footnote: string;
}) {
  const deltaClass =
    deltaTone === "ok"
      ? "text-ok"
      : deltaTone === "warn"
        ? "text-warn"
        : deltaTone === "danger"
          ? "text-danger"
          : "text-brand";
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
        <span className={`text-xs font-semibold ${deltaClass}`}>{delta}</span>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={barClass} style={{ width: `${bar.pct}%` }} />
      </div>
      <div className="mono mt-1 text-[10px] text-subtle">{footnote}</div>
    </div>
  );
}
