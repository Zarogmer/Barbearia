import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { BookingCalendar } from "@/components/features/booking/BookingCalendar";
import { StepIndicator } from "@/components/features/booking/StepIndicator";
import { getAvailableSlots } from "@/lib/server/booking-service";
import { getOrgBySlug } from "@/lib/server/orgs";
import {
  getProfessionalById,
  listProfessionalsForService,
} from "@/lib/server/professionals";
import { getActiveServiceById } from "@/lib/server/services-public";
import { cn } from "@/lib/utils";

const MAX_DAYS_AHEAD = 60; // RN-06

function todayIsoIn(timezone: string): string {
  const now = toZonedTime(new Date(), timezone);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatSlotLabel(startUtc: Date, timezone: string): string {
  const z = toZonedTime(startUtc, timezone);
  const hh = String(z.getHours()).padStart(2, "0");
  const mm = String(z.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

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
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  if (!sp.serviceId || !sp.professionalId) redirect(`/${orgSlug}/agendar`);

  const service = await getActiveServiceById(org.id, sp.serviceId);
  if (!service) redirect(`/${orgSlug}/agendar`);

  // RN-12 "qualquer profissional": resolve para o primeiro em ordem alfabética
  // que faça o serviço. Mostramos slots desse — escolha real do profissional
  // no PBI-08 (confirmação) com base no slot escolhido.
  let resolvedProfessionalId = sp.professionalId;
  if (sp.professionalId === "any") {
    const candidates = await listProfessionalsForService(org.id, sp.serviceId);
    if (candidates.length === 0) redirect(`/${orgSlug}/agendar/profissional?serviceId=${sp.serviceId}`);
    resolvedProfessionalId = candidates[0]!.id;
  }

  const professional =
    sp.professionalId === "any"
      ? null
      : await getProfessionalById(org.id, resolvedProfessionalId);
  if (sp.professionalId !== "any" && !professional) {
    redirect(`/${orgSlug}/agendar/profissional?serviceId=${sp.serviceId}`);
  }

  const selectedDate = sp.date ?? todayIsoIn(org.timezone);
  const selectedTime = sp.time;
  const baseQs = `serviceId=${sp.serviceId}&professionalId=${sp.professionalId}`;

  const slots = await getAvailableSlots({
    organizationId: org.id,
    professionalId: resolvedProfessionalId,
    serviceId: sp.serviceId,
    date: selectedDate,
  });

  const nextHref =
    selectedTime && selectedDate
      ? `/${orgSlug}/agendar/confirmar?${baseQs}&date=${selectedDate}&time=${selectedTime}`
      : "#";

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
        {professional
          ? ` · com ${professional.name.split(" ")[0]}`
          : " · qualquer profissional"}
      </p>

      <section className="mb-6">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-subtle">
            <CalendarIcon className="h-3.5 w-3.5" />
            Escolha a data
          </h2>
        </div>
        <BookingCalendar
          basePath={`/${orgSlug}/agendar/horario`}
          baseQuery={baseQs}
          selectedDate={selectedDate}
          maxDaysAhead={MAX_DAYS_AHEAD}
        />
      </section>

      <section className="mb-6 flex-1">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="mono text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Horários disponíveis
          </h2>
          <span className="mono text-xs text-subtle">
            {slots.length} {slots.length === 1 ? "livre" : "livres"}
          </span>
        </div>
        {slots.length === 0 ? (
          <p className="mono rounded-md border border-dashed border-line bg-surface-2 px-4 py-6 text-center text-xs text-subtle">
            Nenhum horário livre nesse dia. Escolha outra data.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const label = formatSlotLabel(s.startUtc, org.timezone);
              const isSelected = selectedTime === label;
              return (
                <Link
                  key={s.startUtc.toISOString()}
                  href={`/${orgSlug}/agendar/horario?${baseQs}&date=${selectedDate}&time=${label}`}
                  replace
                  data-state={isSelected ? "active" : "default"}
                  className="chip-slot"
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
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
