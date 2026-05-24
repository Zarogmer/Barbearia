"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Zap } from "lucide-react";

import { quickCreateBookingAction } from "@/app/admin/agenda/actions";
import {
  initialAgendaActionState,
  type AdminAgendaActionResult,
} from "@/app/admin/agenda/state";
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

type ServiceOption = { id: string; name: string; durationMinutes: number };
type ProfessionalOption = { id: string; name: string };

type Props = {
  date: string; // YYYY-MM-DD
  professionals: ProfessionalOption[];
  services: ServiceOption[];
  defaultProfessionalId?: string;
  defaultTime?: string; // HH:MM
  triggerLabel?: string;
};

export function QuickBookingDialog({
  date,
  professionals,
  services,
  defaultProfessionalId,
  defaultTime,
  triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useActionState<AdminAgendaActionResult, FormData>(
    quickCreateBookingAction,
    initialAgendaActionState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  const canSubmit = professionals.length > 0 && services.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          {triggerLabel ?? "Novo"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Zap className="h-4 w-4" />
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            Novo agendamento (encaixe)
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Para atendimento por telefone, retorno fidelizado ou encaixe entre
            horários. Conflito de horário com outro confirmado ainda barra.
          </DialogDescription>
        </DialogHeader>

        {!canSubmit ? (
          <p className="rounded-md border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
            {professionals.length === 0 && "Nenhum profissional cadastrado. "}
            {services.length === 0 && "Nenhum serviço cadastrado."}
          </p>
        ) : (
          <form action={dispatch} className="space-y-3.5">
            <input type="hidden" name="date" value={date} />

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
              name="customerName"
              label="Nome do cliente *"
              placeholder="Ex: Pedro Lima"
              error={state.fieldErrors?.customerName}
              required
            />
            <Field
              id="customerPhone"
              name="customerPhone"
              label="WhatsApp"
              type="tel"
              placeholder="(11) 99999-8888"
              mono
              error={state.fieldErrors?.customerPhone}
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
                defaultValue={defaultProfessionalId ?? professionals[0]?.id}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
                required
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
                htmlFor="serviceId"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Serviço *
              </label>
              <select
                id="serviceId"
                name="serviceId"
                defaultValue={services[0]?.id}
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} min
                  </option>
                ))}
              </select>
              {state.fieldErrors?.serviceId && (
                <p className="mt-1 text-[11px] text-danger">
                  {state.fieldErrors.serviceId}
                </p>
              )}
            </div>

            <Field
              id="time"
              name="time"
              label="Horário *"
              type="time"
              defaultValue={defaultTime}
              error={state.fieldErrors?.time}
              required
              mono
            />

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
                placeholder="Ex: encaixe a pedido, retorno"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
              />
              {state.fieldErrors?.notes && (
                <p className="mt-1 text-[11px] text-danger">{state.fieldErrors.notes}</p>
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
        )}
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
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
        pending
          ? "cursor-wait opacity-75"
          : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Criando…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Criar encaixe
        </>
      )}
    </button>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required,
  error,
  mono,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  mono?: boolean;
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
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
          mono && "mono",
          error
            ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
            : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
