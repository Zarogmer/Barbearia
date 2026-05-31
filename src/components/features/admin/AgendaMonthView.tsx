"use client";

import Link from "next/link";
import { cn, formatBRL } from "@/lib/utils";

type Props = {
  year: number;
  month: number; // 1-12
  daysSummary: Record<string, { count: number; revenueCents: number }>;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AgendaMonthView({ year, month, daysSummary }: Props) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const daysInMonth = lastDay.getUTCDate();
  const startWeekday = firstDay.getUTCDay();

  // Constrói grid 6 semanas × 7 dias
  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, iso: isoDay(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });

  const todayIso = new Date().toISOString().slice(0, 10);

  // Total do mês
  const monthTotal = Object.values(daysSummary).reduce(
    (acc, s) => ({
      count: acc.count + s.count,
      revenueCents: acc.revenueCents + s.revenueCents,
    }),
    { count: 0, revenueCents: 0 },
  );

  // Nav prev/next month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const todayIsoFull = todayIso;
  const prevFirstIso = isoDay(prevYear, prevMonth, 1);
  const nextFirstIso = isoDay(nextYear, nextMonth, 1);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-3xl">
        {/* Header com nav mês e totais */}
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/agenda?view=month&date=${prevFirstIso}`}
              className="tap inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface hover:bg-surface-2"
              aria-label="Mês anterior"
            >
              ‹
            </Link>
            <h2 className="font-display text-base font-bold capitalize">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <Link
              href={`/admin/agenda?view=month&date=${nextFirstIso}`}
              className="tap inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface hover:bg-surface-2"
              aria-label="Próximo mês"
            >
              ›
            </Link>
            <Link
              href={`/admin/agenda?view=month&date=${todayIsoFull}`}
              className="ml-1 tap inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
            >
              Hoje
            </Link>
          </div>
          <div className="mono text-xs text-subtle">
            {monthTotal.count} agendamento{monthTotal.count !== 1 && "s"} ·{" "}
            <span className="font-semibold text-ink">
              {formatBRL(monthTotal.revenueCents)}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          {/* Header dias da semana */}
          <div className="grid grid-cols-7 border-b border-line bg-surface-2">
            {WEEKDAY_SHORT.map((d) => (
              <div
                key={d}
                className="mono px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((c, i) => {
              if (!c.day || !c.iso) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[64px] border-b border-r border-line bg-surface-2/40 last:border-r-0 sm:min-h-[80px]"
                  />
                );
              }
              const summary = daysSummary[c.iso];
              const hasAppts = !!summary && summary.count > 0;
              const isToday = c.iso === todayIso;
              // Intensidade visual baseada em count (0-3+)
              const intensity = !summary
                ? "none"
                : summary.count <= 2
                  ? "low"
                  : summary.count <= 5
                    ? "med"
                    : "high";

              return (
                <Link
                  key={c.iso}
                  href={`/admin/agenda?view=day&date=${c.iso}`}
                  className={cn(
                    "tap group min-h-[64px] cursor-pointer border-b border-r border-line p-1.5 transition-colors last:border-r-0 hover:bg-brand-soft/60 sm:min-h-[80px] sm:p-2",
                    isToday && "ring-2 ring-brand ring-inset",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "num text-xs font-bold",
                        isToday ? "text-brand" : "text-ink",
                      )}
                    >
                      {c.day}
                    </span>
                    {hasAppts && (
                      <span
                        className={cn(
                          "mono inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold",
                          intensity === "low" && "bg-ok/15 text-ok",
                          intensity === "med" && "bg-brand/15 text-brand",
                          intensity === "high" && "bg-danger/15 text-danger",
                        )}
                      >
                        {summary.count}
                      </span>
                    )}
                  </div>
                  {hasAppts && (
                    <div className="mono mt-1 hidden text-[9px] text-subtle sm:block">
                      {formatBRL(summary.revenueCents)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 mono text-[10px] text-subtle">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-ok" /> 1-2
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand" /> 3-5
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-danger" /> 6+
          </span>
          <span>· clique pra abrir o dia</span>
        </div>
      </div>
    </div>
  );
}
