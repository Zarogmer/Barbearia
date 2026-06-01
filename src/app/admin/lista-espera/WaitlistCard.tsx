"use client";

import { useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  Trash2,
  XCircle,
} from "lucide-react";

import type { WaitlistRow } from "@/lib/server/waitlist";
import { cn } from "@/lib/utils";

import {
  deleteWaitlistAction,
  updateWaitlistStatusAction,
} from "./actions";

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function buildWhatsappLink(phone: string, name: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(
    `Oi ${name.split(" ")[0]}! Apareceu horário pra você. Posso te encaixar?`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

const STATUS_TONE = {
  WAITING: "bg-warn/10 text-warn",
  NOTIFIED: "bg-brand-soft text-brand",
  SCHEDULED: "bg-ok/10 text-ok",
  EXPIRED: "bg-surface-2 text-subtle",
} as const;

const STATUS_LABEL = {
  WAITING: "aguardando",
  NOTIFIED: "notificado",
  SCHEDULED: "agendado",
  EXPIRED: "expirado",
} as const;

export function WaitlistCard({ entry }: { entry: WaitlistRow }) {
  const [pending, startTransition] = useTransition();
  const waLink = entry.customerPhone
    ? buildWhatsappLink(entry.customerPhone, entry.customerName)
    : null;

  function setStatus(status: WaitlistRow["status"]) {
    startTransition(async () => {
      const r = await updateWaitlistStatusAction(entry.id, status);
      if (r.error) alert(r.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Remover ${entry.customerName} da lista?`)) return;
    startTransition(async () => {
      const r = await deleteWaitlistAction(entry.id);
      if (r.error) alert(r.error);
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border border-line bg-surface p-3 transition-opacity",
        pending && "opacity-50",
      )}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {entry.customerName}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 mono text-[9px] font-semibold uppercase tracking-wider",
                STATUS_TONE[entry.status],
              )}
            >
              {STATUS_LABEL[entry.status]}
            </span>
            {entry.daysWaiting > 0 && entry.status === "WAITING" && (
              <span className="mono text-[10px] text-subtle">
                há {entry.daysWaiting}d
              </span>
            )}
          </div>
          <div className="mono text-[10px] text-subtle">
            {entry.serviceName}
            {entry.professionalName && <> · {entry.professionalName}</>}
            {!entry.professionalName && <> · qualquer prof</>}
            {" · "}
            {formatDate(entry.preferredDateStart)} →{" "}
            {formatDate(entry.preferredDateEnd)}
          </div>
          {entry.customerPhone && (
            <div className="mono text-[10px] text-subtle">
              <Phone className="inline h-2.5 w-2.5" /> {entry.customerPhone}
            </div>
          )}
          {entry.notes && (
            <p className="mt-1 text-xs text-subtle">{entry.notes}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
        {waLink && entry.status === "WAITING" && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setStatus("NOTIFIED")}
            className="tap inline-flex h-7 items-center gap-1 rounded-md bg-ok/10 px-2 text-[11px] font-semibold text-ok hover:bg-ok/20"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp + marcar notificado
          </a>
        )}
        {entry.status === "NOTIFIED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("SCHEDULED")}
            className="tap inline-flex h-7 items-center gap-1 rounded-md bg-brand/10 px-2 text-[11px] font-semibold text-brand hover:bg-brand/20"
          >
            <CheckCircle2 className="h-3 w-3" />
            Marcar agendado
          </button>
        )}
        {(entry.status === "WAITING" || entry.status === "NOTIFIED") && (
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
          className="tap ml-auto rounded-md p-1.5 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
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
