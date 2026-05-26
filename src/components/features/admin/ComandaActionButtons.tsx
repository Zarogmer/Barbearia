"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Trash2, X } from "lucide-react";

import {
  applyDiscountAction,
  cancelComandaAction,
  closeComandaAction,
  removeItemAction,
  removePaymentAction,
} from "@/app/admin/comandas/actions";
import {
  initialComandaActionState,
  type ComandaActionState,
} from "@/app/admin/comandas/state";
import { cn, formatBRL } from "@/lib/utils";

export function CloseComandaButton({
  comandaId,
  disabled,
}: {
  comandaId: string;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    setError(null);
    startTransition(async () => {
      const r = await closeComandaAction(comandaId);
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={handle}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ok px-4 text-sm font-semibold text-white shadow-sm transition-all",
          disabled || pending
            ? "cursor-not-allowed opacity-60"
            : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Fechando…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Fechar comanda
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-center text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CancelComandaButton({ comandaId }: { comandaId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handle() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await cancelComandaAction(comandaId);
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={handle}
        className={cn(
          "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border bg-surface px-4 text-xs font-semibold transition-colors",
          confirm
            ? "border-danger bg-danger/5 text-danger"
            : "border-line text-subtle hover:border-danger/40 hover:text-danger",
          pending && "cursor-wait opacity-60",
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        {confirm ? "Confirmar cancelamento" : "Cancelar comanda"}
      </button>
      {error && (
        <p role="alert" className="text-center text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function RemoveItemButton({
  comandaId,
  itemId,
}: {
  comandaId: string;
  itemId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      await removeItemAction(comandaId, itemId);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handle}
      aria-label="Remover item"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-danger/10 hover:text-danger",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function RemovePaymentButton({
  comandaId,
  paymentId,
}: {
  comandaId: string;
  paymentId: string;
}) {
  const [pending, startTransition] = useTransition();
  function handle() {
    startTransition(async () => {
      await removePaymentAction(comandaId, paymentId);
    });
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={handle}
      aria-label="Remover pagamento"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function DiscountForm({
  comandaId,
  currentDiscountCents,
}: {
  comandaId: string;
  currentDiscountCents: number;
}) {
  const action = applyDiscountAction.bind(null, comandaId);
  const [state, dispatch] = useActionState<ComandaActionState, FormData>(
    action,
    initialComandaActionState,
  );
  return (
    <form action={dispatch} className="flex items-end gap-2">
      <div className="flex-1">
        <label
          htmlFor="discountReais"
          className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle"
        >
          Desconto (R$)
        </label>
        <input
          id="discountReais"
          name="discountReais"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(currentDiscountCents / 100).toFixed(2)}
          className="mono h-9 w-full rounded-md border border-line bg-surface px-2 text-xs outline-none transition-colors focus:border-brand"
        />
      </div>
      <DiscountSubmit />
      {state.error && (
        <p role="alert" className="text-[10px] text-danger">
          {state.error}
        </p>
      )}
      {state.ok && currentDiscountCents > 0 && (
        <span className="mono text-[10px] text-ok">{formatBRL(currentDiscountCents)}</span>
      )}
    </form>
  );
}

function DiscountSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors",
        pending ? "cursor-wait opacity-60" : "hover:bg-surface-2",
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aplicar"}
    </button>
  );
}
