"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Save } from "lucide-react";

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

import { addWaitlistAction } from "./actions";
import {
  initialWaitlistFormState,
  type WaitlistFormState,
} from "./state";

type ServiceOption = { id: string; name: string };
type ProfessionalOption = { id: string; name: string };

type Props = {
  services: ServiceOption[];
  professionals: ProfessionalOption[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WaitlistFormDialog({ services, professionals }: Props) {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useActionState<WaitlistFormState, FormData>(
    addWaitlistAction,
    initialWaitlistFormState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            Adicionar à lista de espera
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Cliente quer atender, defina janela preferida + serviço.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-4">
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
              required
              placeholder="João Silva"
              error={state.fieldErrors?.customerName}
            />
            <Field
              id="customerPhone"
              label="WhatsApp"
              type="tel"
              placeholder="(11) 99999-8888"
              mono
              error={state.fieldErrors?.customerPhone}
            />

            <div>
              <label
                htmlFor="serviceId"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Serviço *
              </label>
              <select
                id="serviceId"
                name="serviceId"
                defaultValue={services[0]?.id ?? ""}
                required
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="professionalId"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Profissional (vazio = qualquer)
              </label>
              <select
                id="professionalId"
                name="professionalId"
                defaultValue=""
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
              >
                <option value="">Qualquer profissional</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="preferredDateStart"
                label="De *"
                type="date"
                defaultValue={todayIso()}
                required
                mono
                error={state.fieldErrors?.preferredDateStart}
              />
              <Field
                id="preferredDateEnd"
                label="Até *"
                type="date"
                defaultValue={plusDaysIso(7)}
                required
                mono
                error={state.fieldErrors?.preferredDateEnd}
              />
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
                placeholder="Ex: prefere sábado de tarde"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:shadow-glow"
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
      Adicionar
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
