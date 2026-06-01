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

import { savePackageAction } from "./actions";
import {
  initialPackageFormState,
  type PackageFormState,
} from "./state";

type ServiceOption = { id: string; name: string; priceCents: number };

type Props = {
  mode: "create" | "edit";
  services: ServiceOption[];
  defaults?: {
    id: string;
    name: string;
    serviceId: string;
    sessionsCount: number;
    priceCents: number;
    expiresInDays: number | null;
    active: boolean;
  };
};

function centsToReal(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function PackageFormDialog({ mode, services, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(defaults?.active ?? true);
  const [state, dispatch] = useActionState<PackageFormState, FormData>(
    savePackageAction,
    initialPackageFormState,
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
            Novo pacote
          </button>
        ) : (
          <button
            type="button"
            aria-label="Editar"
            className="tap rounded-md p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "create" ? "Novo pacote" : "Editar pacote"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Cliente compra adiantado e tem saldo de N sessões pra usar.
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
              label="Nome do pacote *"
              defaultValue={defaults?.name}
              placeholder="Ex: 10 Cortes Premium"
              required
              error={state.fieldErrors?.name}
            />

            <div>
              <label
                htmlFor="serviceId"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Serviço incluído *
              </label>
              <select
                id="serviceId"
                name="serviceId"
                defaultValue={defaults?.serviceId ?? services[0]?.id ?? ""}
                required
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.serviceId && (
                <p className="mt-1 text-[11px] text-danger">
                  {state.fieldErrors.serviceId}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="sessionsCount"
                label="Sessões *"
                type="number"
                defaultValue={String(defaults?.sessionsCount ?? 10)}
                min={1}
                max={200}
                required
                mono
                error={state.fieldErrors?.sessionsCount}
              />
              <Field
                id="priceReais"
                label="Preço total (R$) *"
                defaultValue={
                  defaults ? centsToReal(defaults.priceCents) : "0,00"
                }
                placeholder="200,00"
                required
                mono
                error={state.fieldErrors?.priceCents}
              />
            </div>

            <Field
              id="expiresInDays"
              label="Expira em (dias) — vazio = não expira"
              type="number"
              defaultValue={
                defaults?.expiresInDays ? String(defaults.expiresInDays) : ""
              }
              placeholder="60"
              min={1}
              max={3650}
              mono
              error={state.fieldErrors?.expiresInDays}
            />

            <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
              <label htmlFor="active" className="cursor-pointer text-sm">
                <div className="font-semibold">Ativo</div>
                <div className="text-xs text-subtle">
                  Pacote inativo não aparece pra venda na ficha do cliente.
                </div>
              </label>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
              <input
                type="hidden"
                name="active"
                value={active ? "true" : "false"}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-line bg-surface px-6 py-3 sm:gap-2">
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
  min,
  max,
  mono,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
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
        min={min}
        max={max}
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
