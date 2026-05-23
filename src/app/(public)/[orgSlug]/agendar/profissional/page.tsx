import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StepIndicator } from "@/components/features/booking/StepIndicator";
import { getOrgBySlug, getProfessionalsForService, getServiceById } from "@/lib/mock-data";

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

  const nextHref =
    selected === "any" || selected
      ? `/${orgSlug}/agendar/horario?serviceId=${serviceId}&professionalId=${selected}`
      : "#";

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar?serviceId=${serviceId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <StepIndicator current={2} total={4} />
      </div>

      <h1 className="mb-1 text-2xl font-bold">Com quem você quer?</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {service.name} · escolha um profissional ou deixe o sistema escolher.
      </p>

      <Link href={`/${orgSlug}/agendar/profissional?serviceId=${serviceId}&professionalId=any`} replace>
        <Card
          className={`mb-4 flex items-center gap-3 p-4 transition ${
            selected === "any"
              ? "border-primary ring-2 ring-primary"
              : "hover:border-foreground/30"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <div className="font-medium">Qualquer profissional</div>
            <div className="text-sm text-muted-foreground">Mais rápido — o primeiro livre.</div>
          </div>
        </Card>
      </Link>

      <div className="mb-6">
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou escolha
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {professionals.map((p) => (
            <Link
              key={p.id}
              href={`/${orgSlug}/agendar/profissional?serviceId=${serviceId}&professionalId=${p.id}`}
              replace
            >
              <Card
                className={`flex flex-col items-center p-4 text-center transition ${
                  selected === p.id
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-foreground/30"
                }`}
              >
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <User className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">{p.name.split(" ")[0]}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Link
        href={nextHref}
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
