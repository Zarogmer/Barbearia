"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { formatBRL } from "@/lib/utils";

/**
 * PBI-61: barra fixa no bottom em mobile com "a partir de R$ X · Agendar".
 * So aparece depois de rolar >300px (evita cobrir o hero + primeiros CTAs
 * que ja tem botao "Agendar agora"). Some no desktop (sm+) pra nao poluir.
 *
 * `minPriceCents` = menor preco entre servicos ativos. Se undefined/0,
 * mostra so o botao sem preco.
 */
type Props = {
  orgSlug: string;
  minPriceCents?: number | null;
};

const SHOW_AFTER_PX = 300;

export function StickyBookingCTA({ orgSlug, minPriceCents }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur transition-all duration-200 sm:hidden " +
        (visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0")
      }
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        {minPriceCents ? (
          <div className="flex-1 leading-tight">
            <div className="mono text-[9px] font-semibold uppercase tracking-wider text-subtle">
              A partir de
            </div>
            <div className="num text-base font-bold">{formatBRL(minPriceCents)}</div>
          </div>
        ) : (
          <div className="flex-1 text-xs text-subtle">Escolha um horário</div>
        )}
        <Link
          href={`/${orgSlug}/agendar`}
          className="tap flex h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg"
        >
          Agendar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
