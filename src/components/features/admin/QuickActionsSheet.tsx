"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Image as ImageIcon,
  Plus,
  Receipt,
  UserPlus,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Action = {
  href: string;
  label: string;
  description: string;
  Icon: typeof Plus;
  tone: "brand" | "ok" | "warn" | "subtle";
};

const ACTIONS: Action[] = [
  {
    href: "/admin/agenda",
    label: "Novo agendamento",
    description: "Encaixar cliente na agenda do dia",
    Icon: CalendarPlus,
    tone: "brand",
  },
  {
    href: "/admin/comandas",
    label: "Abrir comanda",
    description: "Começar atendimento no balcão",
    Icon: Receipt,
    tone: "ok",
  },
  {
    href: "/admin/clientes",
    label: "Cadastrar cliente",
    description: "Novo cliente avulso ou importar em massa",
    Icon: UserPlus,
    tone: "subtle",
  },
  {
    href: "/admin/feed",
    label: "Publicar no feed",
    description: "Foto / novidade pros clientes",
    Icon: ImageIcon,
    tone: "warn",
  },
];

type Props = {
  /** Quando true, renderiza como botão FAB. Default true. */
  asFab?: boolean;
};

export function QuickActionsSheet({ asFab = true }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger */}
      {asFab ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Criar"
          className="tap relative -mt-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg ring-4 ring-surface transition-transform hover:-translate-y-1 active:scale-95"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Criar
        </button>
      )}

      {/* Sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom">
            {/* Handle bar (visual cue swipe-to-close) */}
            <div className="flex justify-center pt-2.5">
              <div className="h-1 w-10 rounded-full bg-line" />
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-display text-lg font-bold">O que criar?</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="tap inline-flex h-9 w-9 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-1.5 px-3 pb-4">
              {ACTIONS.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "tap flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-all hover:-translate-y-px hover:border-brand hover:shadow-sm",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md",
                        a.tone === "brand" && "bg-brand-soft text-brand",
                        a.tone === "ok" && "bg-ok/15 text-ok",
                        a.tone === "warn" && "bg-warn/15 text-warn",
                        a.tone === "subtle" && "bg-surface-2 text-subtle",
                      )}
                    >
                      <a.Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{a.label}</div>
                      <div className="text-[11px] text-subtle">
                        {a.description}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
