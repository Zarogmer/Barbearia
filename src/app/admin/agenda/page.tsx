import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import {
  APPOINTMENTS,
  getProfessionalsByOrg,
  getServiceById,
  ORGS,
} from "@/lib/mock-data";
import { cn, formatTime } from "@/lib/utils";

const HOUR_START = 9;
const HOUR_END = 19;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.5; // 90px per 60min

export default function AgendaPage() {
  const org = ORGS[0]!;
  const professionals = getProfessionalsByOrg(org.id);
  const today = new Date();
  const todayShort = today.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  function minutesFromStart(date: Date): number {
    return date.getHours() * 60 + date.getMinutes() - HOUR_START * 60;
  }

  return (
    <div className="flex h-full flex-col p-4 lg:p-8">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
            <button
              type="button"
              className="rounded-md p-1.5 transition-colors hover:bg-surface-2"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="mono px-2 text-sm font-bold">{todayShort}</span>
            <button
              type="button"
              className="rounded-md p-1.5 transition-colors hover:bg-surface-2"
              aria-label="Próximo dia"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-semibold transition-colors hover:bg-surface-2"
          >
            Hoje
          </button>
          <div className="flex overflow-hidden rounded-lg border border-line bg-surface">
            <button
              type="button"
              className="bg-ink px-3 py-1.5 text-xs font-semibold text-[hsl(var(--surface))]"
            >
              Dia
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:bg-surface-2"
              disabled
            >
              Semana
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:bg-surface-2"
              disabled
            >
              Mês
            </button>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo
        </button>
      </div>

      {/* Grade */}
      <div className="flex-1 overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex h-full">
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

          {/* Colunas dos profissionais */}
          <div
            className="grid flex-1 overflow-auto"
            style={{ gridTemplateColumns: `repeat(${professionals.length}, minmax(0, 1fr))` }}
          >
            {professionals.map((p) => {
              const apts = APPOINTMENTS.filter(
                (a) => a.professionalId === p.id && a.status === "CONFIRMED",
              );
              const initials = p.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div key={p.id} className="border-r border-line last:border-r-0">
                  <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-line bg-surface-2 px-3">
                    <span className="avatar-ring">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                        {initials}
                      </span>
                    </span>
                    <div className="leading-tight">
                      <div className="text-xs font-semibold">{p.name}</div>
                      <div className="mono text-[10px] text-subtle">
                        {apts.length} ag · ocup.
                      </div>
                    </div>
                  </div>

                  <div
                    className="relative"
                    style={{ height: `${(HOUR_END - HOUR_START + 1) * 60 * PX_PER_MINUTE}px` }}
                  >
                    {/* Linhas de slot */}
                    {hours.flatMap((h) =>
                      [0, SLOT_MINUTES].map((m) => (
                        <div
                          key={`${h}-${m}`}
                          className={cn(
                            "absolute left-0 right-0 border-t",
                            m === 0 ? "border-line" : "border-dashed border-line/60",
                          )}
                          style={{
                            top: `${((h - HOUR_START) * 60 + m) * PX_PER_MINUTE}px`,
                          }}
                        />
                      )),
                    )}

                    {/* Appointments */}
                    {apts.map((a) => {
                      const top = minutesFromStart(a.startsAt) * PX_PER_MINUTE;
                      const height =
                        (a.endsAt.getTime() - a.startsAt.getTime()) / 60000 * PX_PER_MINUTE;
                      const svc = getServiceById(a.serviceId);
                      return (
                        <button
                          type="button"
                          key={a.id}
                          className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md bg-brand p-1.5 text-left text-[11px] text-brand-fg shadow-sm transition-transform hover:-translate-y-px hover:shadow-md"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="truncate text-[11px] font-semibold leading-tight">
                            {a.customerName}
                          </div>
                          <div className="mono truncate text-[10px] leading-tight opacity-90">
                            {formatTime(a.startsAt)} · {svc?.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mono mt-3 text-[10px] uppercase tracking-wider text-subtle">
        Legenda · <span className="rounded bg-brand/15 px-1.5 py-0.5 text-ink">confirmado</span> ·
        clique num bloco abre detalhes (PBI-09)
      </p>
    </div>
  );
}
