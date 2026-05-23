import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
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
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  function minutesFromStart(date: Date): number {
    return date.getHours() * 60 + date.getMinutes() - HOUR_START * 60;
  }

  return (
    <div className="flex h-full flex-col p-4 lg:p-8">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border bg-card p-2 hover:bg-accent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="rounded-lg border bg-card px-3 py-2 text-sm font-medium capitalize">
            {today}
          </div>
          <button className="rounded-lg border bg-card p-2 hover:bg-accent">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
            Hoje
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card text-sm">
            <button className="bg-accent px-3 py-2 font-medium">Dia</button>
            <button className="px-3 py-2 text-muted-foreground" disabled>
              Semana (v2)
            </button>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
      </div>

      {/* Grade */}
      <Card className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Coluna de horas */}
          <div className="w-14 shrink-0 border-r text-xs text-muted-foreground">
            <div className="h-10 border-b" />
            {hours.map((h) => (
              <div
                key={h}
                className="border-b pl-2 pt-1 font-medium tabular-nums"
                style={{ height: `${60 * PX_PER_MINUTE}px` }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Colunas dos profissionais */}
          <div className="grid flex-1 grid-cols-2 overflow-auto">
            {professionals.map((p) => {
              const apts = APPOINTMENTS.filter(
                (a) => a.professionalId === p.id && a.status === "CONFIRMED",
              );

              return (
                <div key={p.id} className="border-r last:border-r-0">
                  <div className="sticky top-0 z-10 flex h-10 items-center justify-center border-b bg-muted/50 px-3 text-sm font-semibold">
                    {p.name}
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
                            m === 0 ? "border-border" : "border-dashed border-border/50",
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
                        <div
                          key={a.id}
                          className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border border-primary/30 bg-primary/15 p-1.5 text-xs hover:bg-primary/25"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="font-medium leading-tight">{a.customerName}</div>
                          <div className="leading-tight text-muted-foreground">
                            {formatTime(a.startsAt)} · {svc?.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Legenda: <span className="rounded bg-primary/15 px-1.5 py-0.5">Confirmado</span> · clique em um
        slot livre cria encaixe · clique num bloco abre detalhes (PBI-09 implementa interação).
      </p>
    </div>
  );
}
