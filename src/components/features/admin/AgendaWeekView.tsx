"use client";

import Link from "next/link";
import { toZonedTime } from "date-fns-tz";
import { ArrowRight, User as UserIcon } from "lucide-react";

import {
  colorForStatus,
  DEFAULT_APPOINTMENT_COLORS,
  type AppointmentColors,
} from "@/lib/appointment-colors";
import { cn, formatBRL } from "@/lib/utils";

type Appt = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  customerName: string;
  serviceName: string;
  servicePriceCents: number;
  professionalId: string;
  professionalName: string;
};

type Props = {
  /** ISO YYYY-MM-DD do domingo da semana */
  weekStart: string;
  appointments: Appt[];
  timezone: string;
  colors?: AppointmentColors;
};

const WEEKDAY_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function dayLabel(iso: string): { weekday: string; short: string; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d!));
  const wd = dt.getUTCDay();
  return {
    weekday: WEEKDAY_LABEL[wd]!,
    short: WEEKDAY_SHORT[wd]!,
    day: dt.getUTCDate(),
  };
}

function formatHHMM(iso: string, timezone: string): string {
  const z = toZonedTime(new Date(iso), timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

function ymdLocal(iso: string, timezone: string): string {
  const z = toZonedTime(new Date(iso), timezone);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const d = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AgendaWeekView({
  weekStart,
  appointments,
  timezone,
  colors = DEFAULT_APPOINTMENT_COLORS,
}: Props) {
  // Agrupa appointments por dia local (YYYY-MM-DD no fuso da org)
  const byDay = new Map<string, Appt[]>();
  for (const a of appointments) {
    const key = ymdLocal(a.startsAtIso, timezone);
    const list = byDay.get(key) ?? [];
    list.push(a);
    byDay.set(key, list);
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-3xl space-y-3">
        {Array.from({ length: 7 }, (_, i) => {
          const dayIso = addDays(weekStart, i);
          const label = dayLabel(dayIso);
          const dayAppts = byDay.get(dayIso) ?? [];
          const isToday = dayIso === todayIso;
          const dayTotalCents = dayAppts
            .filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED")
            .reduce((s, a) => s + a.servicePriceCents, 0);

          return (
            <section
              key={dayIso}
              className={cn(
                "overflow-hidden rounded-md border bg-surface",
                isToday ? "border-brand shadow-sm" : "border-line",
              )}
            >
              <header
                className={cn(
                  "flex items-center justify-between gap-3 border-b border-line px-4 py-3",
                  isToday ? "bg-brand-soft" : "bg-surface-2",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "inline-flex h-10 w-10 flex-col items-center justify-center rounded-md text-center leading-tight",
                      isToday ? "bg-brand text-brand-fg" : "bg-surface-3 text-ink",
                    )}
                  >
                    <span className="mono text-[8px] font-bold uppercase">
                      {label.short}
                    </span>
                    <span className="num text-sm font-extrabold">{label.day}</span>
                  </div>
                  <div>
                    <Link
                      href={`/admin/agenda?view=day&date=${dayIso}`}
                      className="font-display text-sm font-bold hover:text-brand"
                    >
                      {label.weekday}
                      {isToday && (
                        <span className="ml-2 mono text-[9px] uppercase tracking-wider text-brand">
                          hoje
                        </span>
                      )}
                    </Link>
                    <div className="mono text-[10px] text-subtle">
                      {dayAppts.length} agendamento{dayAppts.length !== 1 && "s"}
                      {dayTotalCents > 0 && (
                        <>
                          {" · "}
                          {formatBRL(dayTotalCents)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/admin/agenda?view=day&date=${dayIso}`}
                  className="tap inline-flex h-9 items-center gap-1 rounded-md text-xs font-semibold text-subtle hover:text-brand"
                  aria-label={`Abrir dia ${label.weekday}`}
                >
                  Abrir
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </header>

              {dayAppts.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="mono text-[11px] uppercase tracking-wider text-subtle">
                    sem agendamentos
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {dayAppts.map((a) => (
                    <li
                      key={a.id}
                      className="grid grid-cols-[60px_1fr_auto] items-center gap-3 px-4 py-2.5"
                    >
                      <div
                        className="mono rounded-md px-2 py-1 text-center text-xs font-bold"
                        style={{
                          backgroundColor: colorForStatus(colors, a.status),
                          color: "#fff",
                        }}
                      >
                        {formatHHMM(a.startsAtIso, timezone)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {a.customerName}
                        </div>
                        <div className="mono flex items-center gap-2 text-[10px] text-subtle">
                          <span className="truncate">{a.serviceName}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <UserIcon className="h-2.5 w-2.5" />
                            {a.professionalName.split(" ")[0]}
                          </span>
                        </div>
                      </div>
                      <div className="mono text-xs font-semibold">
                        {formatBRL(a.servicePriceCents)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
