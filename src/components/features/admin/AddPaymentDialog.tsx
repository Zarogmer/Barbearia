"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CreditCard, Loader2 } from "lucide-react";

import { addPaymentAction } from "@/app/admin/comandas/actions";
import {
  initialComandaActionState,
  type ComandaActionState,
} from "@/app/admin/comandas/state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatBRL } from "@/lib/utils";

type Props = {
  comandaId: string;
  remainingCents: number;
};

const METHODS: { value: "CASH" | "PIX" | "CREDIT" | "DEBIT" | "CORTESIA"; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CREDIT", label: "Crédito" },
  { value: "DEBIT", label: "Débito" },
  { value: "CORTESIA", label: "Cortesia" },
];

export function AddPaymentDialog({ comandaId, remainingCents }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<typeof METHODS[number]["value"]>("CASH");
  const action = addPaymentAction.bind(null, comandaId);
  const [state, dispatch] = useActionState<ComandaActionState, FormData>(
    action,
    initialComandaActionState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  const defaultAmount =
    method === "CORTESIA" ? "0.00" : (remainingCents / 100).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
        >
          <CreditCard className="h-4 w-4" />
          Pagamento
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Registrar pagamento
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Restante: <span className="mono font-semibold text-ink">{formatBRL(remainingCents)}</span>
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-3.5">
          {state.error && !state.fieldErrors && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Método *
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-semibold transition-colors",
                    method === m.value
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink hover:bg-surface-2",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="method" value={method} />
          </div>

          <div>
            <label
              htmlFor="amountReais"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Valor (R$) *
            </label>
            <input
              id="amountReais"
              name="amountReais"
              type="number"
              step="0.01"
              min="0"
              key={method + remainingCents} // re-render pra atualizar defaultValue ao trocar método
              defaultValue={defaultAmount}
              required
              autoFocus
              className={cn(
                "mono h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
                state.fieldErrors?.amountCents
                  ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
                  : "border-line focus:border-brand focus:shadow-glow",
              )}
            />
            {state.fieldErrors?.amountCents && (
              <p className="mt-1 text-[11px] text-danger">
                {state.fieldErrors.amountCents}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Cancelar
            </button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
        pending
          ? "cursor-wait opacity-75"
          : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Salvando…
        </>
      ) : (
        "Registrar"
      )}
    </button>
  );
}
