import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Instagram,
  MapPin,
  MessageCircle,
  Scissors,
} from "lucide-react";

import { getOrgPublicProfile } from "@/lib/server/orgs";

type Params = { orgSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await getOrgPublicProfile(orgSlug);
  if (!org) return { title: "Não encontrada" };
  return {
    title: `${org.name} · Bio`,
    description: org.tagline ?? `Agende horário na ${org.name}`,
    openGraph: {
      title: org.name,
      description: org.tagline ?? `Agende horário na ${org.name}`,
      images: org.coverImageUrl ? [org.coverImageUrl] : [],
    },
  };
}

function whatsappLink(phone: string, orgName: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(`Olá! Vim do link bio da ${orgName}.`);
  return `https://wa.me/${normalized}?text=${text}`;
}

function instagramLink(handle: string): string {
  const cleaned = handle.replace(/^@/, "").trim();
  if (cleaned.startsWith("http")) return cleaned;
  return `https://instagram.com/${cleaned}`;
}

function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default async function BioPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgPublicProfile(orgSlug);
  if (!org) notFound();

  const initials = org.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6">
        {/* Avatar */}
        <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-brand bg-surface-2 shadow-lg">
          {org.coverImageUrl ? (
            <Image
              src={org.coverImageUrl}
              alt={org.name}
              fill
              className="object-cover"
              sizes="112px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-3xl font-extrabold">
              {initials}
            </div>
          )}
        </div>

        {/* Nome + tagline */}
        <header className="text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {org.name}
          </h1>
          {org.tagline && (
            <p className="mt-2 text-sm text-subtle">{org.tagline}</p>
          )}
        </header>

        {/* CTA principal — Agendar */}
        <Link
          href={`/${org.slug}/agendar`}
          className="tap group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-brand-fg shadow-lg transition-all hover:-translate-y-px hover:shadow-xl active:translate-y-0"
        >
          <Calendar className="h-5 w-5" />
          Agendar online
          <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Botões redondos sociais */}
        <div className="flex items-center gap-4">
          {org.whatsapp && (
            <SocialButton
              href={whatsappLink(org.whatsapp, org.name)}
              label="WhatsApp"
              tone="ok"
            >
              <MessageCircle className="h-5 w-5" />
            </SocialButton>
          )}
          {org.instagram && (
            <SocialButton
              href={instagramLink(org.instagram)}
              label="Instagram"
              tone="brand"
            >
              <Instagram className="h-5 w-5" />
            </SocialButton>
          )}
          {org.address && (
            <SocialButton
              href={mapsLink(org.address)}
              label="Como chegar"
              tone="subtle"
            >
              <MapPin className="h-5 w-5" />
            </SocialButton>
          )}
        </div>

        {/* Endereço resumido (se houver) */}
        {org.address && (
          <p className="text-center text-xs text-subtle">{org.address}</p>
        )}

        {/* Links secundários */}
        <div className="w-full space-y-2">
          <Link
            href={`/${org.slug}`}
            className="tap flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-brand hover:bg-brand-soft"
          >
            <span className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Ver serviços e fotos
            </span>
            <ArrowRight className="h-4 w-4 text-subtle" />
          </Link>
        </div>

        {/* Rodapé */}
        <footer className="pt-8 text-center">
          <Link
            href="/"
            className="mono text-[10px] uppercase tracking-wider text-subtle hover:text-brand"
          >
            ⚡ feito com Lustro
          </Link>
        </footer>
      </div>
    </main>
  );
}

function SocialButton({
  href,
  label,
  tone,
  children,
}: {
  href: string;
  label: string;
  tone: "ok" | "brand" | "subtle";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "bg-ok text-white hover:bg-ok/90"
      : tone === "brand"
        ? "bg-brand text-brand-fg hover:opacity-90"
        : "bg-surface-2 text-ink hover:bg-surface-3";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`tap inline-flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0 ${toneClass}`}
    >
      {children}
    </a>
  );
}
