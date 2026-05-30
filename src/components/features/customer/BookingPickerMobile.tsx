"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Loader2,
  Scissors,
  User,
} from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatBRL, formatDuration } from "@/lib/utils";
import type { AvailableSlot } from "@/lib/server/slot-calculator";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

type Professional = { id: string; name: string; bio: string | null };

type Props = {
  orgSlug: string;
  timezone: string;
  services: Service[];
  selected: {
    serviceId?: string;
    professionalId?: string;
    date?: string;
    time?: string;
  };
  professionals?: Professional[]; // só carregado se serviceId presente
  slots?: AvailableSlot[]; // só carregado se professionalId+date presentes
  maxDaysAhead: number;
  // Rota onde este picker está renderizado (ex: "/barbearia-demo/agendar" ou
  // "/barbearia-demo/conta/agendar"). Usada pra pushar URL params da seleção.
  basePath: string;
};

function buildQuery(params: Record<string, string | undefined>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) out.set(k, v);
  return out.toString();
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d!);
}

function formatHHMM(utc: Date, timezone: string) {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

export function BookingPickerMobile({
  orgSlug,
  timezone,
  services,
  selected,
  professionals,
  slots,
  maxDaysAhead,
  basePath,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openSheet, setOpenSheet] = useState<null | "service" | "prof" | "time">(null);

  const selectedService = services.find((s) => s.id === selected.serviceId);
  const selectedProfessional = professionals?.find(
    (p) => p.id === selected.professionalId,
  );

  const allReady = !!selected.serviceId && !!selected.professionalId && !!selected.date && !!selected.time;

  function pushSelection(next: Partial<typeof selected>) {
    const merged = { ...selected, ...next };
    // Trocar serviço limpa profissional/data/hora (combinações dependem)
    if (next.serviceId && next.serviceId !== selected.serviceId) {
      merged.professionalId = undefined;
      merged.date = undefined;
      merged.time = undefined;
    }
    // Trocar profissional limpa data/hora
    if (next.professionalId && next.professionalId !== selected.professionalId) {
      merged.date = undefined;
      merged.time = undefined;
    }
    // Trocar data limpa hora
    if (next.date && next.date !== selected.date) merged.time = undefined;

    const qs = buildQuery(merged);
    startTransition(() => router.replace(`${basePath}?${qs}`));
    setOpenSheet(null);
  }

  function goConfirm() {
    if (!allReady) return;
    const qs = buildQuery(selected);
    router.push(`/${orgSlug}/agendar/confirmar?${qs}`);
  }

  return (
    <>
      <div className="space-y-2">
        {/* Card serviço */}
        <SelectorCard
          icon={<Scissors className="h-5 w-5" />}
          label="Selecionar serviço"
          value={
            selectedService
              ? {
                  primary: selectedService.name,
                  secondary: `${formatDuration(selectedService.durationMinutes)} · ${formatBRL(selectedService.priceCents)}`,
                }
              : null
          }
          onClick={() => setOpenSheet("service")}
        />

        {/* Card profissional */}
        <SelectorCard
          icon={<User className="h-5 w-5" />}
          label="Selecionar profissional"
          disabled={!selected.serviceId}
          value={
            selectedProfessional
              ? {
                  primary: selectedProfessional.name,
                  secondary: selectedProfessional.bio?.slice(0, 60) ?? "",
                }
              : null
          }
          onClick={() => setOpenSheet("prof")}
        />

        {/* Card data e hora */}
        <SelectorCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Selecionar data e hora"
          disabled={!selected.professionalId}
          value={
            selected.date && selected.time
              ? {
                  primary: new Date(`${selected.date}T12:00:00Z`).toLocaleDateString(
                    "pt-BR",
                    {
                      weekday: "short",
                      day: "2-digit",
                      month: "long",
                    },
                  ),
                  secondary: selected.time,
                }
              : null
          }
          onClick={() => setOpenSheet("time")}
        />
      </div>

      {/* CTA Agendar */}
      <button
        type="button"
        disabled={!allReady || isPending}
        onClick={goConfirm}
        className={cn(
          "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
          allReady && !isPending
            ? "bg-brand text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg active:translate-y-0"
            : "cursor-not-allowed bg-surface-2 text-subtle",
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </>
        ) : (
          <>
            Agendar
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Sheet: Serviço */}
      <Dialog open={openSheet === "service"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Escolha o serviço
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              {services.length} {services.length === 1 ? "serviço disponível" : "serviços disponíveis"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {services.map((s) => {
              const isSelected = selected.serviceId === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => pushSelection({ serviceId: s.id })}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border bg-surface p-3 text-left transition-all",
                    isSelected
                      ? "border-brand bg-brand-soft"
                      : "border-line hover:border-brand",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      isSelected ? "border-brand" : "border-line",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-brand" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.name}</div>
                    <div className="mono text-xs text-subtle">
                      {formatDuration(s.durationMinutes)} · {formatBRL(s.priceCents)}
                    </div>
                    {s.description && (
                      <div className="mt-1 truncate text-xs text-subtle">
                        {s.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet: Profissional */}
      <Dialog open={openSheet === "prof"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Escolha o profissional
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              Para {selectedService?.name ?? "o serviço"}
            </DialogDescription>
          </DialogHeader>
          {!professionals || professionals.length === 0 ? (
            <p className="mono rounded-md border border-dashed border-line bg-surface-2 p-4 text-center text-xs text-subtle">
              Nenhum profissional disponível para esse serviço.
            </p>
          ) : (
            <div className="max-h-[60vh] grid grid-cols-2 gap-2 overflow-y-auto">
              {professionals.map((p) => {
                const isSelected = selected.professionalId === p.id;
                const initials = p.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => pushSelection({ professionalId: p.id })}
                    className={cn(
                      "flex flex-col items-center rounded-md border bg-surface p-4 text-center transition-all",
                      isSelected
                        ? "border-brand shadow-glow"
                        : "border-line hover:border-brand",
                    )}
                  >
                    <span className="avatar-ring mb-2">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-sm font-bold">
                        {initials}
                      </span>
                    </span>
                    <div className="text-sm font-semibold">{p.name.split(" ")[0]}</div>
                    {isSelected && (
                      <span className="mt-1 mono text-[9px] uppercase tracking-wider text-brand">
                        Selecionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet: Data e Hora */}
      <Dialog open={openSheet === "time"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Escolha data e hora
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              Com {selectedProfessional?.name.split(" ")[0] ?? "o profissional"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-line bg-surface p-2">
              <Calendar
                mode="single"
                selected={selected.date ? fromIsoDate(selected.date) : undefined}
                onSelect={(d) => {
                  if (d) pushSelection({ date: toIsoDate(d) });
                }}
                disabled={{
                  before: new Date(new Date().setHours(0, 0, 0, 0)),
                  after: new Date(Date.now() + maxDaysAhead * 86_400_000),
                }}
                showOutsideDays={false}
              />
            </div>
            {selected.date && (
              <div>
                <h3 className="mb-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                  Horários disponíveis
                </h3>
                {!slots || slots.length === 0 ? (
                  <p className="mono rounded-md border border-dashed border-line bg-surface-2 p-4 text-center text-xs text-subtle">
                    Sem horários livres nesse dia. Escolha outra data.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => {
                      const label = formatHHMM(s.startUtc, timezone);
                      const isSelected = selected.time === label;
                      return (
                        <button
                          type="button"
                          key={s.startUtc.toISOString()}
                          onClick={() => pushSelection({ time: label })}
                          data-state={isSelected ? "active" : "default"}
                          className="chip-slot"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SelectorCard({
  icon,
  label,
  value,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: { primary: string; secondary?: string } | null;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border bg-surface p-4 text-left transition-all",
        disabled
          ? "cursor-not-allowed border-line opacity-60"
          : "border-line hover:-translate-y-px hover:border-brand hover:shadow-sm",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
          value ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink",
        )}
      >
        {value ? <Check className="h-5 w-5" /> : icon}
      </span>
      <div className="flex-1 min-w-0">
        {value ? (
          <>
            <div className="truncate text-sm font-semibold">{value.primary}</div>
            {value.secondary && (
              <div className="mono truncate text-[11px] text-subtle">
                {value.secondary}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-sm font-semibold">{label}</div>
            <div className="mono text-[10px] uppercase tracking-wider text-subtle">
              {disabled ? "Escolha o anterior primeiro" : "Toque para escolher"}
            </div>
          </>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-subtle" />
    </button>
  );
}
