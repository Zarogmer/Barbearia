"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Filter, Users, X } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Prof = {
  id: string;
  name: string;
  appointmentsCount: number;
};

type Props = {
  /** YYYY-MM-DD da data atual */
  currentDate: string;
  /** ID do profissional filtrado, ou null pra "Todos" */
  currentProfId: string | null;
  /** Lista pra filtrar */
  professionals: Prof[];
};

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d!, 12, 0, 0);
}

export function AgendaFiltersSheet({
  currentDate,
  currentProfId,
  professionals,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    dateFromIso(currentDate),
  );
  const [selectedProfId, setSelectedProfId] = useState<string | null>(
    currentProfId,
  );
  const [isPending, startTransition] = useTransition();

  const activeProf = professionals.find((p) => p.id === currentProfId);
  const hasActiveFilter = !!activeProf;

  function handleApply() {
    const params = new URLSearchParams();
    params.set("date", isoFromDate(selectedDate));
    if (selectedProfId) params.set("prof", selectedProfId);
    startTransition(() => {
      router.push(`/admin/agenda?${params.toString()}`);
      setOpen(false);
    });
  }

  function handleClearProf() {
    startTransition(() => {
      router.push(`/admin/agenda?date=${currentDate}`);
    });
  }

  return (
    <>
      {/* Trigger button — sempre visível no header da agenda */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              "tap inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-all",
              hasActiveFilter
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface text-ink hover:border-brand/60",
            )}
            aria-label="Abrir filtros"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            {hasActiveFilter && (
              <span className="mono inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-fg">
                1
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Filtros da agenda
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              Escolha data e profissional. Vazio = todos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Calendário */}
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                <CalendarDays className="h-3 w-3" />
                Data
              </div>
              <div className="flex justify-center rounded-md border border-line bg-surface p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="rounded-md"
                />
              </div>
            </div>

            {/* Lista profs */}
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                <Users className="h-3 w-3" />
                Profissional
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedProfId(null)}
                  className={cn(
                    "tap flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold transition-all",
                    selectedProfId === null
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink hover:border-brand/60",
                  )}
                >
                  <span>Todos os profissionais</span>
                  {selectedProfId === null && <Check className="h-4 w-4" />}
                </button>
                {professionals.map((p) => {
                  const active = selectedProfId === p.id;
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
                      onClick={() => setSelectedProfId(p.id)}
                      className={cn(
                        "tap flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all",
                        active
                          ? "border-brand bg-brand-soft"
                          : "border-line bg-surface hover:border-brand/60",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                          active
                            ? "bg-brand text-brand-fg"
                            : "bg-surface-3 text-ink",
                        )}
                      >
                        {initials}
                      </span>
                      <span className="flex-1 text-left font-semibold">
                        {p.name}
                      </span>
                      <span className="mono text-[10px] text-subtle">
                        {p.appointmentsCount} ag
                      </span>
                      {active && <Check className="h-4 w-4 text-brand" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="tap h-10 flex-1 rounded-lg border border-line bg-surface text-sm font-semibold transition-colors hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isPending}
                className="tap h-10 flex-1 rounded-lg bg-ink text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-60"
              >
                Aplicar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chip de filtro ativo (visível quando filtrado) */}
      {hasActiveFilter && activeProf && (
        <button
          type="button"
          onClick={handleClearProf}
          className="tap inline-flex h-9 items-center gap-1.5 rounded-full border border-brand bg-brand-soft px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
          aria-label="Limpar filtro de profissional"
        >
          <Users className="h-3 w-3" />
          {activeProf.name}
          <X className="h-3 w-3" />
        </button>
      )}
    </>
  );
}
