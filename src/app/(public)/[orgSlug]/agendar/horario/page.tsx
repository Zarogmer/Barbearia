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
  searchParams: Promise<{ serviceId?: string; professionalId?: string; date?: string; time?: string }>;
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

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar/profissional?serviceId=${sp.serviceId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <StepIndicator current={3} total={4} />
      </div>

      <h1 className="mb-1 text-2xl font-bold">Quando?</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {service.name} {professional ? `· com ${professional.name.split(" ")[0]}` : "· qualquer profissional"}
      </p>

      {/* Datas próximas */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <CalendarIcon className="h-4 w-4" />
          Próximos dias
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {NEXT_7_DAYS.map((d) => {
            const dateStr = d.toISOString().split("T")[0]!;
            const isSelected = dateStr === selectedDate;
            const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" });
            return (
              <Link
                key={dateStr}
                href={`/${orgSlug}/agendar/horario?${baseQs}&date=${dateStr}`}
                replace
                className={`flex flex-col items-center rounded-lg border px-4 py-2 transition ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:border-foreground/30"
                }`}
              >
                <span className="text-xs uppercase">{weekday.slice(0, 3)}</span>
                <span className="text-lg font-semibold">{d.getDate()}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      <div className="mb-6">
        <div className="mb-2 text-sm font-medium">Horários disponíveis</div>
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
                className={`flex h-12 items-center justify-center rounded-lg border text-sm font-medium transition ${
                  occupied
                    ? "cursor-not-allowed border-dashed border-muted-foreground/20 bg-muted text-muted-foreground line-through"
                    : isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-foreground/30"
                }`}
              >
                {t}
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href={nextHref}
        aria-disabled={!selectedTime}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition ${
          selectedTime
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground"
        }`}
      >
        Continuar
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
