"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Pencil, Plus, Save } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { saveExpenseAction } from "./actions";
import {
  initialExpenseFormState,
  type ExpenseFormState,
} from "./state";

type Props = {
  mode: "create" | "edit";
  defaults?: {
    id: string;
    name: string;
    amountCents: number;
    expenseDate: Date;
    category: string | null;
    notes: string | null;
    paid: boolean;
  };
};

function centsToReal(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function dateIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const COMMON_CATEGORIES = [
  "Aluguel",
  "Produtos",
  "Salários",
  "Taxa cartão",
  "Marketing",
  "Conta de luz",
  "Internet",
  "Manutenção",
];

export function ExpenseFormDialog({ mode, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(defaults?.paid ?? true);
  const [state, dispatch] = useActionState<ExpenseFormState, FormData>(
    saveExpenseAction,
    initialExpenseFormState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <button
            type="button"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Nova despesa
          </button>
        ) : (
          <button
            type="button"
            aria-label="Editar"
            className="tap rounded-md p-2 text-subtle hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "create" ? "Nova despesa" : "Editar despesa"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Aluguel, produtos, salários, taxa cartão. Tudo que sai do caixa.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-4">
            {defaults?.id && (
              <input type="hidden" name="id" value={defaults.id} />
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
              id="name"
              label="Descrição *"
              defaultValue={defaults?.name}
              placeholder="Ex: Aluguel maio/2026"
              required
              error={state.fieldErrors?.name}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="amountReais"
                label="Valor (R$) *"
                defaultValue={
                  defaults ? centsToReal(defaults.amountCents) : "0,00"
                }
                placeholder="500,00"
                required
                mono
                error={state.fieldErrors?.amountCents}
              />
              <Field
                id="expenseDate"
                label="Data *"
                type="date"
                defaultValue={
                  defaults ? dateIso(defaults.expenseDate) : todayIso()
                }
                required
                mono
                error={state.fieldErrors?.expenseDate}
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Categoria
              </label>
              <input
                id="category"
                name="category"
                list="common-categories"
                defaultValue={defaults?.category ?? ""}
                placeholder="Ex: Aluguel"
                className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:shadow-glow"
              />
              <datalist id="common-categories">
                {COMMON_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Observação
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={500}
                defaultValue={defaults?.notes ?? ""}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:shadow-glow"
              />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
              <label htmlFor="paid" className="cursor-pointer text-sm">
                <div className="font-semibold">Pago</div>
                <div className="text-xs text-subtle">
                  Desligue se ainda não foi pago (vai pra &quot;Pendente&quot;).
                </div>
              </label>
              <Switch id="paid" checked={paid} onCheckedChange={setPaid} />
              <input
                type="hidden"
                name="paid"
                value={paid ? "true" : "false"}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-line bg-surface px-6 py-3 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
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
        "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm",
        pending ? "cursor-wait opacity-75" : "hover:-translate-y-px hover:shadow-lg",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Salvar
    </button>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  required,
  placeholder,
  mono,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
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
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
          mono && "mono",
          error
            ? "border-danger"
            : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
