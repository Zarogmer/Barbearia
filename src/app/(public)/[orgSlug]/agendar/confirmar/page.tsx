import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

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
  const fakeId = "demo-" + Math.random().toString(36).slice(2, 8);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar/horario?serviceId=${sp.serviceId}&professionalId=${sp.professionalId}&date=${sp.date}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <StepIndicator current={4} total={4} />
      </header>

      <h1 className="mb-1.5 font-display text-2xl font-extrabold tracking-tight">Quase lá</h1>
      <p className="mb-6 text-sm text-subtle">Confira o resumo e preencha seus dados.</p>

      {/* Resumo */}
      <section className="mb-5 rounded-md border border-line bg-surface-2 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-subtle">Serviço</dt>
            <dd className="font-semibold">{service.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-subtle">Profissional</dt>
            <dd className="font-semibold">{professional.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-subtle">Data</dt>
            <dd className="mono font-semibold">{friendlyDate}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-subtle">Horário</dt>
            <dd className="mono font-semibold">{sp.time}</dd>
          </div>
          <div className="my-1.5 h-px bg-line" />
          <div className="flex items-baseline justify-between">
            <dt className="text-subtle">Total</dt>
            <dd className="font-display text-lg font-extrabold">
              {formatBRL(service.priceCents)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Form */}
      <form action={`/${orgSlug}/agendamento/${fakeId}`} className="space-y-3.5">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            Nome *
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Seu nome completo"
            className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(11) 99999-8888"
            className="mono h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="voce@email.com"
            className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
          />
        </div>

        <label className="flex items-start gap-2.5 pt-1 text-xs">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-line accent-[hsl(var(--brand))]"
          />
          <span className="text-subtle">
            Concordo com os <span className="text-ink underline-offset-2 hover:underline">termos de cancelamento</span>{" "}
            (cancelar até 2h antes).
          </span>
        </label>

        <button
          type="submit"
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Check className="h-4 w-4" />
          Confirmar agendamento
        </button>

        <p className="text-center mono text-[10px] text-subtle">
          protótipo · em produção dispara Server Action com Zod (PBI-08)
        </p>
      </form>
    </main>
  );
}
