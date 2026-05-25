import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, Scissors, User } from "lucide-react";

import { getOrgBySlug } from "@/lib/server/orgs";

/**
 * PBI-48 Fase 3 (a fazer): single-screen com hero foto + 3 cards seletores
 * (barbeiro, serviço, data) + bottom sheets + CTA Agendar.
 *
 * Por enquanto: placeholder com 3 cards estáticos que linkam pro fluxo
 * existente /[orgSlug]/agendar (4 steps). Quando Fase 3 entrar, esse
 * file vira o single-screen real.
 */
export default async function AgendarTab({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Agendamento</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Agende seu horário
        </h1>
        <p className="text-sm text-subtle">
          Escolha um serviço e horário em {org.name}.
        </p>
      </header>

      <div className="space-y-2">
        <PlaceholderCard
          icon={<User className="h-5 w-5" />}
          label="Selecionar barbeiro"
          hint="Em breve"
        />
        <PlaceholderCard
          icon={<Scissors className="h-5 w-5" />}
          label="Selecionar serviço"
          hint="Em breve"
        />
        <PlaceholderCard
          icon={<Calendar className="h-5 w-5" />}
          label="Selecionar data e hora"
          hint="Em breve"
        />
      </div>

      <Link
        href={`/${orgSlug}/agendar`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      >
        Usar fluxo atual (4 passos)
        <ArrowRight className="h-4 w-4" />
      </Link>

      <p className="text-center mono text-[10px] uppercase tracking-wider text-subtle">
        PBI-48 Fase 3 em construção · fluxo legacy disponível acima
      </p>
    </div>
  );
}

function PlaceholderCard({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-line bg-surface p-4 text-subtle">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-ink">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="mono text-[10px] uppercase tracking-wider">{hint}</div>
      </div>
      <ArrowRight className="h-4 w-4 opacity-40" />
    </div>
  );
}
