import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Check, MapPin } from "lucide-react";

import { getOrgBySlug } from "@/lib/mock-data";

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const org = getOrgBySlug(orgSlug);

  if (!org) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12 text-center sm:max-w-2xl">
      <div className="animate-pop-check mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg shadow-[hsl(var(--brand)/0.4)]">
        <Check className="h-10 w-10" strokeWidth={3} />
      </div>

      <h1 className="mb-2 font-display text-3xl font-extrabold tracking-tight">Confirmado!</h1>
      <p className="mb-7 max-w-xs text-sm text-subtle">
        Vamos te esperar. Enviamos os detalhes pro seu email.
      </p>

      {/* Resumo */}
      <div className="mb-5 w-full rounded-md border border-line bg-gradient-to-br from-surface to-surface-2 p-5 text-left">
        <div className="mb-3 flex items-center gap-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
          <span className="h-2 w-2 rounded-full bg-ok" />
          Confirmado · #{id}
        </div>

        <div className="mb-4 flex items-start gap-3">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div>
            <div className="font-display text-base font-bold tracking-tight">{org.name}</div>
            <div className="mono text-xs text-subtle">aguardando dia/hora confirmados</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="text-xs text-subtle">{org.address}</div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <button className="h-11 rounded-lg border border-line bg-surface text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand hover:shadow-sm">
          Adicionar à agenda (.ics)
        </button>
        <button className="h-11 rounded-lg border border-danger/30 bg-surface text-sm font-semibold text-danger transition-all hover:bg-danger/5">
          Cancelar agendamento
        </button>
        <Link
          href={`/${orgSlug}`}
          className="mt-3 text-xs font-medium text-subtle transition-colors hover:text-ink hover:underline underline-offset-4"
        >
          ← voltar para a barbearia
        </Link>
      </div>

      <p className="mt-10 mono text-[10px] text-subtle">
        powered by <span className="text-brand">Lustro</span>
      </p>
    </main>
  );
}
