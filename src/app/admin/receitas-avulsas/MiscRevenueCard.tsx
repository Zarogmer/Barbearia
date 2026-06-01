"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import type { MiscRevenueRow } from "@/lib/server/misc-revenues";
import { cn, formatBRL } from "@/lib/utils";

import { deleteMiscRevenueAction } from "./actions";
import { MiscRevenueFormDialog } from "./MiscRevenueFormDialog";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  CORTESIA: "Cortesia",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function MiscRevenueCard({ revenue }: { revenue: MiscRevenueRow }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover lançamento "${revenue.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteMiscRevenueAction(revenue.id);
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{revenue.name}</div>
          <div className="mono text-[10px] text-subtle">
            {formatDate(revenue.occurredAt)}
            {revenue.paymentMethod && (
              <> · {METHOD_LABEL[revenue.paymentMethod]}</>
            )}
          </div>
          {revenue.notes && (
            <p className="mt-1 text-xs text-subtle">{revenue.notes}</p>
          )}
        </div>
        <div className="num font-display text-base font-extrabold text-ok">
          {formatBRL(revenue.amountCents)}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 border-t border-line pt-1.5">
        <MiscRevenueFormDialog
          mode="edit"
          defaults={{
            id: revenue.id,
            name: revenue.name,
            amountCents: revenue.amountCents,
            occurredAt: revenue.occurredAt,
            paymentMethod: revenue.paymentMethod,
            notes: revenue.notes,
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Remover"
          className="tap rounded-md p-2 text-subtle hover:bg-danger/10 hover:text-danger"
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
