"use client";

import { useState } from "react";
import { toZonedTime } from "date-fns-tz";

import { AppointmentDetailDialog } from "@/components/features/admin/AppointmentDetailDialog";
import {
  colorForStatus,
  DEFAULT_APPOINTMENT_COLORS,
  readableTextColor,
  type AppointmentColors,
} from "@/lib/appointment-colors";
import { cn } from "@/lib/utils";

const HOUR_START = 9;
const HOUR_END = 19;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.5;

type AgendaProf = {
  id: string;
  name: string;
  appointmentsCount: number;
};

type AgendaAppt = {
  id: string;
  professionalId: string;
  startsAtIso: string; // ISO UTC serializado pelo server
  endsAtIso: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
  professionalName: string;
};

type AgendaBlock = {
  id: string;
  professionalId: string;
  startsAtIso: string;
  endsAtIso: string;
  reason: string | null;
};

type Props = {
  professionals: AgendaProf[];
  appointments: AgendaAppt[];
  blocks: AgendaBlock[];
  timezone: string;
  /** Minutos do dia atual no fuso da org (-1 = não é hoje) */
  nowMinutes: number;
  /** PBI-44: cores por status (default se não passada) */
  colors?: AppointmentColors;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
function cancelRequiresReason(startUtcIso: string): boolean {
  return new Date(startUtcIso).getTime() - Date.now() < TWO_HOURS_MS;
}

function localMinutesIn(utc: Date, timezone: string): number {
  const z = toZonedTime(utc, timezone);
  return z.getHours() * 60 + z.getMinutes();
}

function formatHHMMIn(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

export function AgendaGrid({
  professionals,
  appointments,
  blocks,
  timezone,
  nowMinutes,
  colors = DEFAULT_APPOINTMENT_COLORS,
}: Props) {
  // Mobile: tab ativa = 1 prof por vez. Desktop: grid completo.
  const [activeId, setActiveId] = useState<string>(
    professionals[0]?.id ?? "",
  );

  if (professionals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="mono text-[11px] uppercase tracking-wider text-subtle">
          Nenhum profissional ativo
        </p>
      </div>
    );
  }

  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Tabs mobile: apenas avatar (foto/iniciais) com badge de count.
          Esconde no desktop (>= lg) onde o grid completo mostra todos. */}
      <div className="border-b border-line bg-surface-2 lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
          {professionals.map((p) => {
            const active = p.id === activeId;
            const initials = p.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                aria-label={`Ver agenda de ${p.name}`}
                aria-current={active ? "true" : undefined}
                title={p.name}
                className={cn(
                  "tap relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all",
                  active
                    ? "bg-brand text-brand-fg shadow-md ring-2 ring-brand ring-offset-2 ring-offset-surface-2"
                    : "bg-surface text-ink ring-1 ring-line hover:ring-brand/60",
                )}
              >
                {initials}
                {p.appointmentsCount > 0 && (
                  <span
                    className={cn(
                      "mono absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold",
                      active
                        ? "bg-ink text-surface"
                        : "bg-brand text-brand-fg",
                    )}
                  >
                    {p.appointmentsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Header com nome do prof ativo (substitui texto truncado nas tabs) */}
        {(() => {
          const active = professionals.find((p) => p.id === activeId);
          if (!active) return null;
          return (
            <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2">
              <div className="leading-tight">
                <div className="text-sm font-semibold">{active.name}</div>
                <div className="mono text-[10px] text-subtle">
                  {active.appointmentsCount} agendamento
                  {active.appointmentsCount !== 1 ? "s" : ""} hoje
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Timeline content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Coluna de horas */}
        <div className="w-14 shrink-0 border-r border-line">
          <div className="h-12 border-b border-line bg-surface-2" />
          {hours.map((h) => (
            <div
              key={h}
              className="mono border-b border-line pl-2 pt-1 text-[11px] font-medium text-subtle"
              style={{ height: `${60 * PX_PER_MINUTE}px` }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Colunas profs:
            - Mobile: mostra só a coluna do prof ativo (flex-1)
            - Desktop: grid com todas (lg:grid + minmax) */}
        <div
          className="flex-1 overflow-auto lg:grid"
          style={{
            gridTemplateColumns: `repeat(${professionals.length}, minmax(140px, 1fr))`,
          }}
        >
          {professionals.map((p) => {
            const isActiveMobile = p.id === activeId;
            const apts = appointments.filter(
              (a) => a.professionalId === p.id,
            );
            const blks = blocks.filter((b) => b.professionalId === p.id);
            const initials = p.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={p.id}
                className={cn(
                  "border-r border-line last:border-r-0",
                  // Mobile: só mostra ativa. Desktop: todas
                  isActiveMobile ? "flex flex-1 flex-col" : "hidden",
                  "lg:flex lg:flex-1 lg:flex-col",
                )}
              >
                {/* Header da col (esconde em mobile, mostra em desktop) */}
                <div className="sticky top-0 z-10 hidden h-12 items-center gap-2 border-b border-line bg-surface-2 px-3 lg:flex">
                  <span className="avatar-ring">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                      {initials}
                    </span>
                  </span>
                  <div className="leading-tight">
                    <div className="text-xs font-semibold">{p.name}</div>
                    <div className="mono text-[10px] text-subtle">
                      {p.appointmentsCount} ag
                    </div>
                  </div>
                </div>

                <div
                  className="relative flex-1"
                  style={{
                    height: `${(HOUR_END - HOUR_START + 1) * 60 * PX_PER_MINUTE}px`,
                  }}
                >
                  {/* Grid de slots */}
                  {hours.flatMap((h) =>
                    [0, SLOT_MINUTES].map((m) => (
                      <div
                        key={`${h}-${m}`}
                        className={cn(
                          "absolute left-0 right-0 border-t",
                          m === 0
                            ? "border-line"
                            : "border-dashed border-line/60",
                        )}
                        style={{
                          top: `${((h - HOUR_START) * 60 + m) * PX_PER_MINUTE}px`,
                        }}
                      />
                    )),
                  )}

                  {/* Linha hora atual */}
                  {nowMinutes >= 0 &&
                    nowMinutes >= HOUR_START * 60 &&
                    nowMinutes <= HOUR_END * 60 && (
                      <div
                        className="absolute left-0 right-0 z-[5] h-px bg-danger"
                        style={{
                          top: `${(nowMinutes - HOUR_START * 60) * PX_PER_MINUTE}px`,
                        }}
                      >
                        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger" />
                      </div>
                    )}

                  {/* Blocos */}
                  {blks.map((b) => {
                    const start = new Date(b.startsAtIso);
                    const end = new Date(b.endsAtIso);
                    const startMin = localMinutesIn(start, timezone);
                    const endMin = localMinutesIn(end, timezone);
                    const visStart = Math.max(startMin, HOUR_START * 60);
                    const visEnd = Math.min(endMin, HOUR_END * 60 + 60);
                    if (visEnd <= visStart) return null;
                    const top = (visStart - HOUR_START * 60) * PX_PER_MINUTE;
                    const height = (visEnd - visStart) * PX_PER_MINUTE;
                    return (
                      <div
                        key={b.id}
                        className="absolute left-1 right-1 overflow-hidden rounded-md border border-line bg-[repeating-linear-gradient(45deg,hsl(var(--surface-3))_0,hsl(var(--surface-3))_6px,hsl(var(--surface-2))_6px,hsl(var(--surface-2))_12px)] p-1.5 text-[10px] text-subtle"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <div className="mono uppercase tracking-wider">
                          Bloqueio
                        </div>
                        {b.reason && <div className="truncate">{b.reason}</div>}
                      </div>
                    );
                  })}

                  {/* Appointments */}
                  {apts.map((a) => {
                    const start = new Date(a.startsAtIso);
                    const end = new Date(a.endsAtIso);
                    const startMin = localMinutesIn(start, timezone);
                    const endMin = localMinutesIn(end, timezone);
                    const visStart = Math.max(startMin, HOUR_START * 60);
                    const visEnd = Math.min(endMin, HOUR_END * 60 + 60);
                    if (visEnd <= visStart) return null;
                    const top = (visStart - HOUR_START * 60) * PX_PER_MINUTE;
                    const height = (visEnd - visStart) * PX_PER_MINUTE;
                    const requires = cancelRequiresReason(a.startsAtIso);

                    return (
                      <AppointmentDetailDialog
                        key={a.id}
                        appointment={{
                          id: a.id,
                          customerName: a.customerName,
                          customerPhone: a.customerPhone,
                          serviceName: a.serviceName,
                          serviceDurationMinutes: a.serviceDurationMinutes,
                          servicePriceCents: a.servicePriceCents,
                          professionalName: a.professionalName,
                          status: a.status,
                          startsAtLabel: formatHHMMIn(start, timezone),
                          endsAtLabel: formatHHMMIn(end, timezone),
                        }}
                        requiresCancelReason={requires}
                        trigger={
                          <button
                            type="button"
                            className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md p-1.5 text-left text-[11px] shadow-sm transition-transform hover:-translate-y-px hover:shadow-md"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundColor: colorForStatus(colors, a.status),
                              color: readableTextColor(
                                colorForStatus(colors, a.status),
                              ),
                            }}
                          >
                            <div className="truncate font-semibold leading-tight">
                              {a.customerName}
                            </div>
                            <div className="mono truncate text-[10px] leading-tight opacity-90">
                              {formatHHMMIn(start, timezone)} · {a.serviceName}
                            </div>
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
