"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Receipt } from "lucide-react";

import { openComandaAction } from "@/app/admin/comandas/actions";
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
import { cn } from "@/lib/utils";

type Props = {
  professionals: { id: string; name: string }[];
  defaultCustomerName?: string;
  defaultCustomerUserId?: string;
  triggerLabel?: string;
};

export function OpenComandaDialog({
  professionals,
  defaultCustomerName,
  defaultCustomerUserId,
  triggerLabel = "Abrir comanda",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useActionState<ComandaActionState, FormData>(
    openComandaAction,
    initialComandaActionState,
  );

  useEffect(() => {
    if (state.ok && state.comandaId) {
      setOpen(false);
      router.push(`/admin/comandas/${state.comandaId}`);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Receipt className="h-4 w-4" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Receipt className="h-4 w-4" />
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            Nova comanda
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Abra uma conta no balcão. Itens e pagamentos vêm depois.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-3.5">
          {defaultCustomerUserId && (
            <input type="hidden" name="customerUserId" value={defaultCustomerUserId} />
          )}

          {state.error && !state.fieldErrors && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <Field
            id="customerName"
            label="Nome do cliente *"
            defaultValue={defaultCustomerName}
            required
            error={state.fieldErrors?.customerName}
          />

          <div>
            <label
              htmlFor="professionalId"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Profissional *
            </label>
            <select
              id="professionalId"
              name="professionalId"
              required
              defaultValue={professionals[0]?.id}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.professionalId && (
              <p className="mt-1 text-[11px] text-danger">
                {state.fieldErrors.professionalId}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Observação (opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
            />
          </div>

          <DialogFooter>
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
        "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
        pending
          ? "cursor-wait opacity-75"
          : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Abrindo…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Abrir comanda
        </>
      )}
    </button>
  );
}

function Field({
  id,
  label,
  defaultValue,
  required,
  error,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={!!error}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
          error
            ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
            : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
