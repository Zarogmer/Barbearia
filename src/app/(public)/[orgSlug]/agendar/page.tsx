import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { StepIndicator } from "@/components/features/booking/StepIndicator";
import { getOrgBySlug } from "@/lib/server/orgs";
import { listActiveServices } from "@/lib/server/services-public";
import { cn, formatBRL, formatDuration } from "@/lib/utils";

export default async function ChooseServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { orgSlug } = await params;
  const { serviceId: selected } = await searchParams;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const services = await listActiveServices(org.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <StepIndicator current={1} total={4} />
      </header>

      <h1 className="mb-1.5 font-display text-2xl font-extrabold tracking-tight">
        Escolha o serviço
      </h1>
      <p className="mb-6 text-sm text-subtle">Selecione um para continuar.</p>

      <div className="mb-6 flex-1 space-y-2">
        {services.length === 0 ? (
          <p className="mono text-xs text-subtle">
            Nenhum serviço disponível no momento.
          </p>
        ) : (
          services.map((s) => {
            const isSelected = selected === s.id;
            return (
              <Link
                key={s.id}
                href={`/${orgSlug}/agendar?serviceId=${s.id}`}
                replace
                className={cn(
                  "block rounded-md border bg-surface p-4 transition-all",
                  isSelected
                    ? "border-brand bg-brand-soft shadow-glow"
                    : "border-line hover:-translate-y-px hover:border-brand",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected ? "border-brand" : "border-line",
                    )}
                  >
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-brand animate-pop-in" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold">{s.name}</div>
                    <div
                      className={cn(
                        "mono text-xs",
                        isSelected ? "text-brand" : "text-subtle",
                      )}
                    >
                      {formatDuration(s.durationMinutes)} · {formatBRL(s.priceCents)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <Link
        href={selected ? `/${orgSlug}/agendar/profissional?serviceId=${selected}` : "#"}
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
