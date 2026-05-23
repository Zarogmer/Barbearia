import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Star, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  getOrgBySlug,
  getProfessionalsByOrg,
  getServicesByOrg,
} from "@/lib/mock-data";
import { formatBRL, formatDuration } from "@/lib/utils";

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = getOrgBySlug(orgSlug);

  if (!org) notFound();

  const services = getServicesByOrg(org.id);
  const professionals = getProfessionalsByOrg(org.id);

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl">
      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{org.name}</h1>
        <div className="mb-1 flex items-center gap-1.5 text-sm text-slate-200">
          <MapPin className="h-4 w-4" />
          {org.address}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-200">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {org.rating.toFixed(1)} ({org.reviewsCount} avaliações)
        </div>
      </div>

      {/* CTA primário */}
      <Link
        href={`/${orgSlug}/agendar`}
        className="mb-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
      >
        Agendar agora
        <ArrowRight className="h-5 w-5" />
      </Link>

      {/* Serviços */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Serviços</h2>
        <div className="space-y-2">
          {services.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{formatDuration(s.durationMinutes)}</div>
              </div>
              <div className="text-right text-base font-semibold">{formatBRL(s.priceCents)}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Profissionais */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Profissionais</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {professionals.map((p) => (
            <Card key={p.id} className="flex flex-col items-center p-4 text-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">{p.name.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">{p.bio.slice(0, 30)}…</div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
