"use client";

import { useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { buildQuoteWhatsAppText, type QuoteRow } from "@/lib/server/quotes";
import { cn, formatBRL } from "@/lib/utils";

import {
  deleteQuoteAction,
  updateQuoteStatusAction,
} from "./actions";

const STATUS_TONE: Record<QuoteRow["status"], string> = {
  DRAFT: "bg-surface-2 text-subtle",
  SENT: "bg-warn/10 text-warn",
  ACCEPTED: "bg-ok/10 text-ok",
  EXPIRED: "bg-danger/10 text-danger",
};

const STATUS_LABEL: Record<QuoteRow["status"], string> = {
  DRAFT: "rascunho",
  SENT: "enviado",
  ACCEPTED: "aceito",
  EXPIRED: "expirado",
};

function buildWhatsappLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function QuoteCard({
  quote,
  orgName,
}: {
  quote: QuoteRow;
  orgName: string;
}) {
  const [pending, startTransition] = useTransition();
  const text = buildQuoteWhatsAppText(quote, orgName);
  const waLink = quote.customerPhone
    ? buildWhatsappLink(quote.customerPhone, text)
    : null;

  function setStatus(s: QuoteRow["status"]) {
    startTransition(async () => {
      const r = await updateQuoteStatusAction(quote.id, s);
      if (r.error) alert(r.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Remover orçamento de ${quote.customerName}?`)) return;
    startTransition(async () => {
      const r = await deleteQuoteAction(quote.id);
      if (r.error) alert(r.error);
    });
  }

  function copyText() {
    void navigator.clipboard.writeText(text);
    alert("Texto copiado!");
  }

  return (
    <div
      className={cn(
        "rounded-md border border-line bg-surface p-4 transition-opacity",
        pending && "opacity-50",
      )}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {quote.customerName}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 mono text-[9px] font-semibold uppercase tracking-wider",
                STATUS_TONE[quote.status],
              )}
            >
              {STATUS_LABEL[quote.status]}
            </span>
          </div>
          <div className="mono text-[10px] text-subtle">
            {quote.items.length} item{quote.items.length !== 1 && "s"}
            {quote.expiresAt && (
              <>
                {" "}
                · válido até{" "}
                {quote.expiresAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="num font-display text-lg font-extrabold">
            {formatBRL(quote.totalCents)}
          </div>
        </div>
      </div>

      <details className="my-2 group">
        <summary className="cursor-pointer text-[11px] text-subtle group-open:text-ink">
          Ver itens
        </summary>
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {quote.items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-0"
            >
              <span className="truncate">
                {i.quantity}× {i.name}
              </span>
              <span className="mono shrink-0">{formatBRL(i.subtotalCents)}</span>
            </li>
          ))}
          {quote.discountCents > 0 && (
            <li className="flex justify-between text-warn">
              <span>Desconto</span>
              <span className="mono">-{formatBRL(quote.discountCents)}</span>
            </li>
          )}
        </ul>
        {quote.notes && (
          <p className="mt-2 text-[11px] text-subtle">{quote.notes}</p>
        )}
      </details>

      <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
        {waLink && quote.status !== "ACCEPTED" && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (quote.status === "DRAFT") setStatus("SENT");
            }}
            className="tap inline-flex h-7 items-center gap-1 rounded-md bg-ok/10 px-2 text-[11px] font-semibold text-ok hover:bg-ok/20"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        )}
        {!waLink && (
          <button
            type="button"
            onClick={copyText}
            className="tap inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-subtle hover:border-brand hover:text-brand"
          >
            <Send className="h-3 w-3" />
            Copiar texto
          </button>
        )}
        {(quote.status === "DRAFT" || quote.status === "SENT") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("ACCEPTED")}
            className="tap inline-flex h-7 items-center gap-1 rounded-md bg-brand/10 px-2 text-[11px] font-semibold text-brand hover:bg-brand/20"
          >
            <CheckCircle2 className="h-3 w-3" />
            Marcar aceito
          </button>
        )}
        {(quote.status === "DRAFT" || quote.status === "SENT") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("EXPIRED")}
            className="tap inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-subtle hover:bg-surface-2"
          >
            <XCircle className="h-3 w-3" />
            Expirar
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Remover"
          className="tap ml-auto rounded-md p-1.5 text-subtle hover:bg-danger/10 hover:text-danger"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
