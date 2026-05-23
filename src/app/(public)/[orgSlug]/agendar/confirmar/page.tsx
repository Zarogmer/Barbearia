import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StepIndicator } from "@/components/features/booking/StepIndicator";
import {
  getOrgBySlug,
  getProfessionalById,
  getServiceById,
  PROFESSIONALS,
} from "@/lib/mock-data";
import { formatBRL } from "@/lib/utils";

export default async function ConfirmPage({
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
  if (!sp.serviceId || !sp.professionalId || !sp.date || !sp.time) {
    redirect(`/${orgSlug}/agendar`);
  }

  const service = getServiceById(sp.serviceId);
  if (!service) redirect(`/${orgSlug}/agendar`);

  const professional =
    sp.professionalId === "any"
      ? PROFESSIONALS.find((p) => p.serviceIds.includes(sp.serviceId!))
      : getProfessionalById(sp.professionalId);

  if (!professional) redirect(`/${orgSlug}/agendar`);

  const [yyyy, mm, dd] = sp.date.split("-");
  const friendlyDate = `${dd}/${mm}/${yyyy}`;

  // Prototype: clicking "confirmar" redirects to a fake confirmation page.
  const fakeId = "demo-" + Math.random().toString(36).slice(2, 8);

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar/horario?serviceId=${sp.serviceId}&professionalId=${sp.professionalId}&date=${sp.date}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <StepIndicator current={4} total={4} />
      </div>

      <h1 className="mb-1 text-2xl font-bold">Confirme seus dados</h1>
      <p className="mb-6 text-sm text-muted-foreground">Revise o pedido e preencha seus dados.</p>

      <Card className="mb-6 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Serviço</dt>
            <dd className="font-medium">{service.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Profissional</dt>
            <dd className="font-medium">{professional.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Data</dt>
            <dd className="font-medium">{friendlyDate}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Horário</dt>
            <dd className="font-medium">{sp.time}</dd>
          </div>
          <div className="my-2 h-px bg-border" />
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-base font-bold">{formatBRL(service.priceCents)}</dd>
          </div>
        </dl>
      </Card>

      <form action={`/${orgSlug}/agendamento/${fakeId}`} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Nome <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Seu nome completo"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            Telefone (WhatsApp)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(11) 99999-8888"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="voce@email.com"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <label className="flex items-start gap-2 pt-2 text-sm">
          <input type="checkbox" required className="mt-1 h-4 w-4 rounded border" />
          <span className="text-muted-foreground">
            Concordo com os <a className="underline">termos de uso</a> e{" "}
            <a className="underline">política de privacidade</a>.
          </span>
        </label>

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Check className="h-5 w-5" />
          Confirmar agendamento
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Protótipo · em produção, isso dispara Server Action com validação Zod (PBI-08).
        </p>
      </form>
    </main>
  );
}
