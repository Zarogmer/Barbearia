import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { StepIndicator } from "@/components/features/booking/StepIndicator";
import { getOrgBySlug, getProfessionalsForService, getServiceById } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default async function ChooseProfessionalPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ serviceId?: string; professionalId?: string }>;
}) {
  const { orgSlug } = await params;
  const { serviceId, professionalId } = await searchParams;
  const org = getOrgBySlug(orgSlug);

  if (!org) notFound();
  if (!serviceId) redirect(`/${orgSlug}/agendar`);

  const service = getServiceById(serviceId);
  if (!service) redirect(`/${orgSlug}/agendar`);

  const professionals = getProfessionalsForService(org.id, serviceId);
  const selected = professionalId;
  const baseQs = `serviceId=${serviceId}`;

  const nextHref = selected
    ? `/${orgSlug}/agendar/horario?${baseQs}&professionalId=${selected}`
    : "#";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar?serviceId=${serviceId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <StepIndicator current={2} total={4} />
      </header>

      <h1 className="mb-1.5 font-display text-2xl font-extrabold tracking-tight">
        Com quem?
      </h1>
      <p className="mb-6 text-sm text-subtle">
        {service.name} · escolha um profissional ou deixe pra gente.
      </p>

      {/* Card "Qualquer um" — destaque */}
      <Link
        href={`/${orgSlug}/agendar/profissional?${baseQs}&professionalId=any`}
        replace
        className={cn(
          "relative mb-5 block overflow-hidden rounded-md p-5 text-left transition-all",
          selected === "any"
            ? "shadow-glow ring-2 ring-brand"
            : "hover:-translate-y-px hover:shadow-md",
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-ink to-[hsl(var(--ink)/0.88)]" />
        <div className="relative text-[hsl(var(--surface))]">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="mono text-[10px] font-semibold uppercase tracking-wider opacity-80">
              Recomendado
            </span>
          </div>
          <div className="font-display text-base font-bold">Qualquer profissional</div>
          <div className="text-xs opacity-75">
            Mais rápido — pega o primeiro horário livre.
          </div>
        </div>
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
          ou escolha
        </span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="mb-6 flex-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {professionals.map((p) => {
          const initials = p.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("");
          const isSelected = selected === p.id;
          return (
            <Link
              key={p.id}
              href={`/${orgSlug}/agendar/profissional?${baseQs}&professionalId=${p.id}`}
              replace
              className={cn(
                "flex flex-col items-center rounded-md border bg-surface p-4 text-center transition-all",
                isSelected
                  ? "border-brand shadow-glow"
                  : "border-line hover:-translate-y-px hover:border-brand",
              )}
            >
              <span className="avatar-ring mb-2">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-sm font-bold">
                  {initials}
                </span>
              </span>
              <div className="text-sm font-semibold">{p.name.split(" ")[0]}</div>
              <div className="text-[10px] text-subtle">{p.bio.slice(0, 22)}…</div>
              {isSelected && (
                <span className="mt-1 mono text-[9px] font-semibold uppercase tracking-wider text-brand">
                  Selecionado
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <Link
        href={nextHref}
        aria-disabled={!selected}
        className={cn(
          "sticky bottom-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
          selected
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
