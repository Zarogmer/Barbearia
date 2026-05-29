import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ConfirmForm } from "@/components/features/booking/ConfirmForm";
import { auth } from "@/lib/auth";
import { getOrgBySlug } from "@/lib/server/orgs";
import {
  getProfessionalById,
  listProfessionalsForService,
} from "@/lib/server/professionals";
import { getActiveServiceById } from "@/lib/server/services-public";
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
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  if (!sp.serviceId || !sp.professionalId || !sp.date || !sp.time) {
    redirect(`/${orgSlug}/agendar`);
  }

  const service = await getActiveServiceById(org.id, sp.serviceId);
  if (!service) redirect(`/${orgSlug}/agendar`);

  let professionalDisplay: { name: string };
  if (sp.professionalId === "any") {
    const candidates = await listProfessionalsForService(org.id, sp.serviceId);
    if (candidates.length === 0) {
      redirect(`/${orgSlug}/agendar?serviceId=${sp.serviceId}`);
    }
    professionalDisplay = { name: `${candidates[0]!.name} (qualquer)` };
  } else {
    const p = await getProfessionalById(org.id, sp.professionalId);
    if (!p) redirect(`/${orgSlug}/agendar?serviceId=${sp.serviceId}`);
    professionalDisplay = { name: p.name };
  }

  const [yyyy, mm, dd] = sp.date.split("-");
  const friendlyDate = `${dd}/${mm}/${yyyy}`;

  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}/agendar?serviceId=${sp.serviceId}&professionalId=${sp.professionalId}&date=${sp.date}&time=${sp.time}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
      </header>

      <h1 className="mb-1.5 font-display text-2xl font-extrabold tracking-tight">Quase lá</h1>
      <p className="mb-6 text-sm text-subtle">Confira o resumo e preencha seus dados.</p>

      <section className="mb-5 rounded-md border border-line bg-surface-2 p-4">
        <dl className="space-y-2 text-sm">
          <Row label="Serviço" value={service.name} />
          <Row label="Profissional" value={professionalDisplay.name} />
          <Row label="Data" value={friendlyDate} mono />
          <Row label="Horário" value={sp.time} mono />
          <div className="my-1.5 h-px bg-line" />
          <div className="flex items-baseline justify-between">
            <dt className="text-subtle">Total</dt>
            <dd className="font-display text-lg font-extrabold">
              {formatBRL(service.priceCents)}
            </dd>
          </div>
        </dl>
      </section>

      <ConfirmForm
        ctx={{
          orgSlug,
          serviceId: sp.serviceId,
          professionalId: sp.professionalId,
          date: sp.date,
          time: sp.time,
        }}
        defaultName={session?.user?.name ?? undefined}
      />
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-subtle">{label}</dt>
      <dd className={mono ? "mono font-semibold" : "font-semibold"}>{value}</dd>
    </div>
  );
}
