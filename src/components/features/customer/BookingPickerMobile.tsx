"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarClock,
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

// PBI-64: photoUrl reflete foto real do profissional (Cloudinary). Fallback
// pra iniciais quando null. Mesma logica dos avatares no admin.
type Professional = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
};

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
  /** PBI-64: sugere proximo dia com slots quando slots.length === 0 */
  nextAvailableDate?: string | null;
  maxDaysAhead: number;
  // Rota onde este picker está renderizado (ex: "/barbearia-demo/agendar" ou
  // "/barbearia-demo/conta/agendar"). Usada pra pushar URL params da seleção.
  basePath: string;
};

// PBI-64: periodos do dia usados pra agrupar slots.
type Period = "morning" | "afternoon" | "evening";

const PERIOD_LABELS: Record<Period, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

function slotPeriod(hourLocal: number): Period {
  if (hourLocal < 12) return "morning";
  if (hourLocal < 18) return "afternoon";
  return "evening";
}

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

function friendlyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d!);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function BookingPickerMobile({
  orgSlug,
  timezone,
  services,
  selected,
  professionals,
  slots,
  nextAvailableDate,
  maxDaysAhead,
  basePath,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openSheet, setOpenSheet] = useState<null | "service" | "prof" | "time">(null);

  const selectedService = services.find((s) => s.id === selected.serviceId);
  const selectedProfessional = professionals?.find((p) => p.id === selected.professionalId);

  const allReady =
    !!selected.serviceId && !!selected.professionalId && !!selected.date && !!selected.time;

  // PBI-64: progress bar. 4 passos: servico, profissional, data+hora, confirmar.
  const stepsCompleted =
    (selected.serviceId ? 1 : 0) +
    (selected.professionalId ? 1 : 0) +
    (selected.date && selected.time ? 1 : 0);

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

  // PBI-64: agrupa slots por periodo (manha/tarde/noite).
  const slotsByPeriod = groupSlotsByPeriod(slots ?? [], timezone);

  return (
    <>
      {/* PBI-64: Progress bar 4 segmentos */}
      <StepProgressBar completed={stepsCompleted + (allReady ? 1 : 0)} />

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
          leadingAvatar={
            selectedProfessional
              ? {
                  photoUrl: selectedProfessional.photoUrl,
                  name: selectedProfessional.name,
                }
              : null
          }
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
                  primary: friendlyDate(selected.date),
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
          "tap mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
          allReady && !isPending
            ? "bg-brand text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg"
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
            <DialogTitle className="font-display text-lg font-bold">Escolha o serviço</DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              {services.length}{" "}
              {services.length === 1 ? "serviço disponível" : "serviços disponíveis"}
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
                    isSelected ? "border-brand bg-brand-soft" : "border-line hover:border-brand",
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
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.name}</div>
                    <div className="mono text-xs text-subtle">
                      {formatDuration(s.durationMinutes)} · {formatBRL(s.priceCents)}
                    </div>
                    {s.description && (
                      <div className="mt-1 truncate text-xs text-subtle">{s.description}</div>
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
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto">
              {professionals.map((p) => {
                const isSelected = selected.professionalId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => pushSelection({ professionalId: p.id })}
                    className={cn(
                      "flex flex-col items-center rounded-md border bg-surface p-4 text-center transition-all",
                      isSelected ? "border-brand shadow-glow" : "border-line hover:border-brand",
                    )}
                  >
                    <span className="avatar-ring mb-2">
                      {p.photoUrl ? (
                        <Image
                          src={p.photoUrl}
                          alt={p.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-sm font-bold">
                          {initials(p.name)}
                        </span>
                      )}
                    </span>
                    <div className="text-sm font-semibold">{p.name.split(" ")[0]}</div>
                    {isSelected && (
                      <span className="mono mt-1 text-[9px] uppercase tracking-wider text-brand">
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
                <h3 className="mono mb-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                  Horários disponíveis
                </h3>
                {isPending ? (
                  <SlotSkeleton />
                ) : !slots || slots.length === 0 ? (
                  <EmptyDayState
                    nextAvailableDate={nextAvailableDate ?? null}
                    onGoToNextDay={
                      nextAvailableDate
                        ? () => pushSelection({ date: nextAvailableDate })
                        : undefined
                    }
                  />
                ) : (
                  <SlotsByPeriod
                    slotsByPeriod={slotsByPeriod}
                    selectedTime={selected.time}
                    onPick={(time) => pushSelection({ time })}
                  />
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Subcomponentes PBI-64
// ──────────────────────────────────────────────────────────────

function StepProgressBar({ completed }: { completed: number }) {
  return (
    <div className="mb-4 flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i < completed ? "bg-brand" : "bg-surface-3",
          )}
        />
      ))}
    </div>
  );
}

type SlotsByPeriodMap = Record<Period, Array<{ time: string; utc: Date }>>;

function groupSlotsByPeriod(slots: AvailableSlot[], timezone: string): SlotsByPeriodMap {
  const out: SlotsByPeriodMap = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const s of slots) {
    const time = formatHHMM(s.startUtc, timezone);
    const hour = parseInt(time.slice(0, 2), 10);
    const period = slotPeriod(hour);
    out[period].push({ time, utc: s.startUtc });
  }
  return out;
}

function SlotsByPeriod({
  slotsByPeriod,
  selectedTime,
  onPick,
}: {
  slotsByPeriod: SlotsByPeriodMap;
  selectedTime: string | undefined;
  onPick: (time: string) => void;
}) {
  const periods: Period[] = ["morning", "afternoon", "evening"];
  return (
    <div className="space-y-4">
      {periods.map((p) => {
        const list = slotsByPeriod[p];
        if (list.length === 0) return null;
        return (
          <div key={p}>
            <div className="mono mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">
              <span>{PERIOD_LABELS[p]}</span>
              <span className="h-px flex-1 bg-line" />
              <span>{list.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {list.map((s) => {
                const isSelected = selectedTime === s.time;
                return (
                  <button
                    type="button"
                    key={s.utc.toISOString()}
                    onClick={() => onPick(s.time)}
                    data-state={isSelected ? "active" : "default"}
                    className={cn(
                      "chip-slot flex min-h-11 items-center justify-center rounded-md border px-2 text-sm font-semibold transition-all",
                      isSelected
                        ? "border-brand bg-brand text-brand-fg shadow-sm"
                        : "border-line bg-surface hover:border-brand",
                    )}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotSkeleton() {
  // 8 chips gray-200 com animate-pulse. Cobre bem o "manhã / tarde" tipico.
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando horários">
      {[0, 1].map((row) => (
        <div key={row}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-3 w-16 animate-pulse rounded bg-surface-3" />
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-md bg-surface-3" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyDayState({
  nextAvailableDate,
  onGoToNextDay,
}: {
  nextAvailableDate: string | null;
  onGoToNextDay?: () => void;
}) {
  if (nextAvailableDate && onGoToNextDay) {
    return (
      <div className="space-y-3 rounded-md border border-dashed border-line bg-surface-2 p-4 text-center">
        <p className="text-xs text-subtle">
          Sem horários livres nesse dia. O próximo é{" "}
          <strong className="text-ink">{friendlyDate(nextAvailableDate)}</strong>.
        </p>
        <button
          type="button"
          onClick={onGoToNextDay}
          className="tap inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-xs font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg"
        >
          <CalendarClock className="h-4 w-4" />
          Ver próximo dia disponível
        </button>
      </div>
    );
  }
  return (
    <p className="mono rounded-md border border-dashed border-line bg-surface-2 p-4 text-center text-xs text-subtle">
      Sem horários livres nesse dia. Escolha outra data.
    </p>
  );
}

function SelectorCard({
  icon,
  label,
  value,
  disabled,
  leadingAvatar,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: { primary: string; secondary?: string } | null;
  disabled?: boolean;
  /** PBI-64: quando presente e ha value, substitui icon por avatar (foto ou iniciais). */
  leadingAvatar?: { photoUrl: string | null; name: string } | null;
  onClick: () => void;
}) {
  const showAvatar = value && leadingAvatar;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "tap flex w-full items-center gap-3 rounded-md border bg-surface p-4 text-left transition-all",
        disabled
          ? "cursor-not-allowed border-line opacity-60"
          : "border-line hover:-translate-y-px hover:border-brand hover:shadow-sm",
      )}
    >
      {showAvatar ? (
        <span className="avatar-ring">
          {leadingAvatar!.photoUrl ? (
            <Image
              src={leadingAvatar!.photoUrl}
              alt={leadingAvatar!.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              {initials(leadingAvatar!.name)}
            </span>
          )}
        </span>
      ) : (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            value ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink",
          )}
        >
          {value ? <Check className="h-5 w-5" /> : icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {value ? (
          <>
            <div className="truncate text-sm font-semibold">{value.primary}</div>
            {value.secondary && (
              <div className="mono truncate text-[11px] text-subtle">{value.secondary}</div>
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
