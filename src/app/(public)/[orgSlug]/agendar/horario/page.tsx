import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon } from "lucide-react";

import { StepIndicator } from "@/components/features/booking/StepIndicator";
import {
  getOrgBySlug,
  getProfessionalById,
  getServiceById,
  OCCUPIED_SLOTS,
  SAMPLE_SLOTS,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function getTodayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

const NEXT_7_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

export default async function ChooseTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    serviceId?: string;
    professionalId?: string;
    date?: string;
    time?: string;
  }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const org = getOrgBySlug(orgSlug);

  if (!org) notFound();
  if (!sp.serviceId || !sp.professionalId) redirect(`/${orgSlug}/agendar`);

  const service = getServiceById(sp.serviceId);
  if (!service) redirect(`/${orgSlug}/agendar`);

  const professional =
    sp.professionalId === "any" ? null : getProfessionalById(sp.professionalId);

  const selectedDate = sp.date ?? getTodayPlus(0);
  const selectedTime = sp.time;
  const baseQs = `serviceId=${sp.serviceId}&professionalId=${sp.professionalId}`;

  const nextHref =
    selectedDate && selectedTime
      ? `/${orgSlug}/agendar/confirmar?${baseQs}&date=${selectedDate}&time=${selectedTime}`
      : "#";

  const availableCount = SAMPLE_SLOTS.filter((s) => !OCCUPIED_SLOTS.includes(s)).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar/profissional?serviceId=${sp.serviceId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <StepIndicator current={3} total={4} />
      </header>

      <h1 className="mb-1.5 font-display text-2xl font-extrabold tracking-tight">Quando?</h1>
      <p className="mb-6 text-sm text-subtle">
        {service.name}
        {professional ? ` · com ${professional.name.split(" ")[0]}` : " · qualquer profissional"}
      </p>

      {/* Datas próximas */}
      <section className="mb-6">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-subtle">
            <CalendarIcon className="h-3.5 w-3.5" />
            Próximos dias
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
          {NEXT_7_DAYS.map((d) => {
            const dateStr = d.toISOString().split("T")[0]!;
            const isSelected = dateStr === selectedDate;
            const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
            const isToday = dateStr === getTodayPlus(0);
            return (
              <Link
                key={dateStr}
                href={`/${orgSlug}/agendar/horario?${baseQs}&date=${dateStr}`}
                replace
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-lg border px-4 py-2.5 transition-all",
                  isSelected
                    ? "border-ink bg-ink text-surface"
                    : "border-line bg-surface hover:-translate-y-px hover:border-brand",
                )}
              >
                <span
                  className={cn(
                    "mono text-[10px] uppercase tracking-wider",
                    isSelected ? "opacity-80" : "text-subtle",
                  )}
                >
                  {weekday}
                </span>
                <span className="num mt-0.5 text-lg font-bold leading-none">{d.getDate()}</span>
                {isToday && (
                  <span
                    className={cn(
                      "mt-1 text-[8px] font-bold uppercase tracking-wider",
                      isSelected ? "opacity-80" : "text-brand",
                    )}
                  >
                    hoje
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Slots */}
      <section className="mb-6 flex-1">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="mono text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Horários disponíveis
          </h2>
          <span className="mono text-xs text-subtle">{availableCount} livres</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {SAMPLE_SLOTS.map((t) => {
            const occupied = OCCUPIED_SLOTS.includes(t);
            const isSelected = selectedTime === t;
            const href = occupied
              ? "#"
              : `/${orgSlug}/agendar/horario?${baseQs}&date=${selectedDate}&time=${t}`;
            return (
              <Link
                key={t}
                href={href}
                replace
                aria-disabled={occupied}
                data-state={occupied ? "disabled" : isSelected ? "active" : "default"}
                className="chip-slot"
              >
                {t}
              </Link>
            );
          })}
        </div>
      </section>

      <Link
        href={nextHref}
        aria-disabled={!selectedTime}
        className={cn(
          "sticky bottom-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
          selectedTime
            ? "bg-ink text-surface shadow-sm hover:-translate-y-px hover:shadow-md"
            : "pointer-events-none cursor-not-allowed bg-surface-2 text-subtle",
        )}
      >
        Continuar
        <ArrowRight className="h-4 w-4" />
      </Link>
    </main>
  );
}
