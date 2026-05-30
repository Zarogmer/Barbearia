import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Clock,
  Instagram,
  LogIn,
  MapPin,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react";

import { auth } from "@/lib/auth";
import {
  WEEKDAYS,
  WEEKDAY_LABEL,
  WEEKDAY_SHORT,
  formatHours,
  getZonedDayMinutes,
  isOpenNow,
} from "@/lib/server/business-hours";
import { listActiveProfessionals } from "@/lib/server/professionals";
import { listActiveServices } from "@/lib/server/services-public";
import { getOrgPublicProfile } from "@/lib/server/orgs";
import { getOrgReviewSummary } from "@/lib/server/reviews";
import { formatBRL, formatDuration } from "@/lib/utils";

function timeAgoPt(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / day);
  if (diffDays < 1) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} mês`;
  return `há ${Math.floor(diffDays / 365)} ano(s)`;
}

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgPublicProfile(orgSlug);
  if (!org) notFound();

  const [services, professionals, reviews, session] = await Promise.all([
    listActiveServices(org.id),
    listActiveProfessionals(org.id),
    getOrgReviewSummary(org.id),
    auth(),
  ]);
  const isLoggedIn = !!session?.user;

  const openNow = isOpenNow(org.businessHours, org.timezone);
  const { weekday: todayWeekday } = getZonedDayMinutes(new Date(), org.timezone);
  const todayHours = org.businessHours?.[todayWeekday] ?? null;

  const mapsHref = org.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address)}`
    : null;
  const whatsappHref = org.whatsapp
    ? `https://wa.me/${org.whatsapp.replace(/\D/g, "")}`
    : null;
  const instagramHref = org.instagram
    ? `https://instagram.com/${org.instagram.replace(/^@/, "")}`
    : null;

  return (
    <main className="mx-auto max-w-md px-5 py-5 sm:max-w-2xl">
      {/* Hero — cover image OU gradient fallback */}
      <section className="relative mb-5 overflow-hidden rounded-xl">
        {org.coverImageUrl ? (
          <div className="relative h-48 sm:h-64">
            <Image
              src={org.coverImageUrl}
              alt={`Capa de ${org.name}`}
              fill
              priority
              sizes="(min-width: 640px) 672px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />
          </div>
        ) : (
          <div className="relative h-48 sm:h-64">
            <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-[hsl(var(--brand)/0.55)]" />
            <div className="grid-bg absolute inset-0 opacity-20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5 text-[hsl(var(--surface))]">
          <span className="mono text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
            {org.tagline ?? "Agendamento online"}
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            {org.name}
          </h1>
        </div>
      </section>

      {/* Strip de stats */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {reviews.count > 0 && (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <Star className="h-3.5 w-3.5 fill-brand text-brand" />
            <span className="num font-semibold">{reviews.average.toFixed(1)}</span>
            <span className="text-subtle">({reviews.count})</span>
          </span>
        )}
        {org.address && (
          <span className="inline-flex items-center gap-1.5 text-subtle">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{org.address.split(",")[0]}</span>
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 ${openNow ? "text-ok" : "text-subtle"}`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">
            {openNow
              ? "Aberto agora"
              : todayHours
                ? `Hoje ${formatHours(todayHours)}`
                : "Fechado hoje"}
          </span>
        </span>
      </div>

      {/* CTAs */}
      <div className="mb-8 space-y-2">
        <Link
          href={`/${orgSlug}/agendar`}
          className="tap flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg"
        >
          Agendar agora
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={
            isLoggedIn
              ? `/${orgSlug}/conta/historico`
              : `/login?next=/${orgSlug}/conta/historico`
          }
          className="tap flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-subtle transition-colors hover:border-brand hover:text-ink"
        >
          <LogIn className="h-3.5 w-3.5" />
          {isLoggedIn ? "Acessar minha conta" : "Já tem conta? Entrar"}
        </Link>
      </div>

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
      <section className="mb-8">
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
                    <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-sm font-bold">
                      {p.photoUrl ? (
                        <Image
                          src={p.photoUrl}
                          alt={p.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        initials
                      )}
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

      {/* Avaliações */}
      {reviews.latest3.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-subtle">
              Avaliações
            </h2>
            <span className="inline-flex items-center gap-1 mono text-xs text-subtle">
              <Star className="h-3 w-3 fill-brand text-brand" />
              {reviews.average.toFixed(1)} de {reviews.count}
            </span>
          </div>
          <div className="space-y-2">
            {reviews.latest3.map((r) => (
              <article key={r.id} className="card-i p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex" aria-label={`${r.rating} de 5`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-brand text-brand" : "text-line"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">{r.customerName}</span>
                  </div>
                  <span className="mono text-[10px] text-subtle">
                    {timeAgoPt(r.createdAt)}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-ink/80">{r.comment}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Localização */}
      {org.address && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-subtle">
            Localização
          </h2>
          <div className="card-i p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm leading-snug">{org.address}</p>
                {mapsHref && (
                  <Link
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    Abrir no Maps
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Horário */}
      {org.businessHours && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-subtle">
            Horário
          </h2>
          <div className="card-i divide-y divide-line">
            {WEEKDAYS.map((day) => {
              const block = org.businessHours?.[day];
              const isToday = day === todayWeekday;
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                    isToday ? "bg-brand-soft/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="mono w-10 text-[11px] uppercase text-subtle">
                      {WEEKDAY_SHORT[day]}
                    </span>
                    <span className={isToday ? "font-semibold" : ""}>
                      {WEEKDAY_LABEL[day]}
                    </span>
                  </div>
                  <span
                    className={`mono text-xs ${block ? "text-ink" : "text-subtle"}`}
                  >
                    {formatHours(block)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sociais */}
      {(instagramHref || whatsappHref) && (
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {whatsappHref && (
              <Link
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="tap inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:border-brand"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Link>
            )}
            {instagramHref && (
              <Link
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="tap inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:border-brand"
              >
                <Instagram className="h-4 w-4" />@{org.instagram}
              </Link>
            )}
          </div>
        </section>
      )}

      <p className="mt-10 flex items-center justify-center gap-1 mono text-[10px] text-subtle">
        <Sparkles className="h-3 w-3" />
        powered by <span className="text-brand">Lustro</span>
      </p>
    </main>
  );
}
