import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StepIndicator } from "@/components/features/booking/StepIndicator";
import { getOrgBySlug, getServicesByOrg } from "@/lib/mock-data";
import { formatBRL, formatDuration } from "@/lib/utils";

export default async function ChooseServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { orgSlug } = await params;
  const { serviceId: selected } = await searchParams;
  const org = getOrgBySlug(orgSlug);

  if (!org) notFound();

  const services = getServicesByOrg(org.id);

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <StepIndicator current={1} total={4} />
      </div>

      <h1 className="mb-1 text-2xl font-bold">Escolha o serviço</h1>
      <p className="mb-6 text-sm text-muted-foreground">Selecione o que deseja fazer hoje.</p>

      <div className="mb-6 space-y-2">
        {services.map((s) => {
          const isSelected = selected === s.id;
          return (
            <Link key={s.id} href={`/${orgSlug}/agendar?serviceId=${s.id}`} replace>
              <Card
                className={`flex items-center justify-between p-4 transition ${
                  isSelected ? "border-primary ring-2 ring-primary" : "hover:border-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(s.durationMinutes)} · {formatBRL(s.priceCents)}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Link
        href={
          selected ? `/${orgSlug}/agendar/profissional?serviceId=${selected}` : "#"
        }
        aria-disabled={!selected}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition ${
          selected
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
