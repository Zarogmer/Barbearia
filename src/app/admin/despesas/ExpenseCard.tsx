"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import type { ExpenseRow } from "@/lib/server/expenses";
import { cn, formatBRL } from "@/lib/utils";

import { deleteExpenseAction } from "./actions";
import { ExpenseFormDialog } from "./ExpenseFormDialog";

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function ExpenseCard({ expense }: { expense: ExpenseRow }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover despesa "${expense.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteExpenseAction(expense.id);
      if (r.error) alert(r.error);
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-surface p-3 transition-opacity",
        expense.paid ? "border-line" : "border-warn/40",
        pending && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {expense.name}
            </span>
            {!expense.paid && (
              <span className="rounded-full bg-warn/10 px-1.5 py-0.5 mono text-[9px] font-semibold text-warn">
                pendente
              </span>
            )}
          </div>
          <div className="mono text-[10px] text-subtle">
            {formatDate(expense.expenseDate)}
            {expense.category && <> · {expense.category}</>}
          </div>
          {expense.notes && (
            <p className="mt-1 text-xs text-subtle">{expense.notes}</p>
          )}
        </div>
        <div className="text-right">
          <div
            className={cn(
              "num font-display text-base font-extrabold",
              expense.paid ? "text-ink" : "text-warn",
            )}
          >
            {formatBRL(expense.amountCents)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 border-t border-line pt-1.5">
        <ExpenseFormDialog
          mode="edit"
          defaults={{
            id: expense.id,
            name: expense.name,
            amountCents: expense.amountCents,
            expenseDate: expense.expenseDate,
            category: expense.category,
            notes: expense.notes,
            paid: expense.paid,
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
