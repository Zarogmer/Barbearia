import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";

import { listActiveProfessionals } from "@/lib/server/professionals";
import { listActiveServices } from "@/lib/server/services-public";
import { getOrgBySlug } from "@/lib/server/orgs";
import { formatBRL, formatDuration } from "@/lib/utils";

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const [services, professionals] = await Promise.all([
    listActiveServices(org.id),
    listActiveProfessionals(org.id),
  ]);

  return (
    <main className="mx-auto max-w-md px-5 py-5 sm:max-w-2xl">
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-[hsl(var(--brand)/0.55)]" />
        <div className="grid-bg absolute inset-0 opacity-20" />
        <div className="relative flex flex-col gap-3 p-6 text-[hsl(var(--surface))]">
          <span className="mono text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
            Agendamento online
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight">
            {org.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 opacity-90">
              <MapPin className="h-3.5 w-3.5" />
              {org.timezone}
            </span>
          </div>
        </div>
      </section>

      {/* CTA primário */}
      <Link
        href={`/${orgSlug}/agendar`}
        className="mb-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      >
        Agendar agora
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Serviços */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-subtle">
            Serviços
          </h2>
          <span className="mono text-xs text-subtle">{services.length}</span>
        </div>
        {services.length === 0 ? (
          <p className="mono text-xs text-subtle">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="card-i flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="mono text-xs text-subtle">
                    {formatDuration(s.durationMinutes)}
                  </div>
                </div>
                <div className="num text-base font-semibold">{formatBRL(s.priceCents)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Profissionais */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-subtle">
            Profissionais
          </h2>
          <span className="mono text-xs text-subtle">{professionals.length}</span>
        </div>
        {professionals.length === 0 ? (
          <p className="mono text-xs text-subtle">Nenhum profissional cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {professionals.map((p) => {
              const initials = p.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const shortBio = p.bio?.slice(0, 24) ?? "";
              return (
                <div
                  key={p.id}
                  className="card-i flex flex-col items-center p-4 text-center"
                >
                  <span className="avatar-ring mb-2">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-sm font-bold">
                      {initials}
                    </span>
                  </span>
                  <div className="text-sm font-semibold">{p.name.split(" ")[0]}</div>
                  {shortBio && (
                    <div className="text-[11px] text-subtle">{shortBio}…</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-10 text-center mono text-[10px] text-subtle">
        powered by <span className="text-brand">Lustro</span>
      </p>
    </main>
  );
}
