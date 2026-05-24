"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import {
  confirmBookingAction,
  initialConfirmBookingState,
  type ConfirmBookingState,
} from "@/app/(public)/[orgSlug]/agendar/confirmar/actions";
import { cn } from "@/lib/utils";

type Props = {
  ctx: {
    orgSlug: string;
    serviceId: string;
    professionalId: string;
    date: string;
    time: string;
  };
  defaultName?: string;
  defaultEmail?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        "mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold shadow-sm transition-all",
        pending
          ? "cursor-wait bg-brand/70 text-brand-fg"
          : "bg-brand text-brand-fg hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Confirmando…
        </>
      ) : (
        <>
          <Check className="h-4 w-4" />
          Confirmar agendamento
        </>
      )}
    </button>
  );
}

export function ConfirmForm({ ctx, defaultName, defaultEmail }: Props) {
  const action = confirmBookingAction.bind(null, ctx);
  const [state, dispatch] = useActionState<ConfirmBookingState, FormData>(
    action,
    initialConfirmBookingState,
  );

  return (
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

      <Field
        id="customerName"
        label="Nome *"
        defaultValue={defaultName}
        placeholder="Seu nome completo"
        error={state.fieldErrors?.customerName}
        required
      />
      <Field
        id="customerPhone"
        label="WhatsApp"
        type="tel"
        placeholder="(11) 99999-8888"
        mono
        error={state.fieldErrors?.customerPhone}
      />
      <Field
        id="customerEmail"
        label="Email *"
        type="email"
        defaultValue={defaultEmail}
        placeholder="voce@email.com"
        error={state.fieldErrors?.customerEmail}
        required
      />

      <label className="flex items-start gap-2.5 pt-1 text-xs">
        <input
          name="acceptedTerms"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-line accent-[hsl(var(--brand))]"
        />
        <span className="text-subtle">
          Concordo com os{" "}
          <span className="text-ink underline-offset-2 hover:underline">
            termos de cancelamento
          </span>{" "}
          (cancelar até 2h antes).
        </span>
      </label>
      {state.fieldErrors?.acceptedTerms && (
        <p className="text-xs text-danger">{state.fieldErrors.acceptedTerms}</p>
      )}

      <SubmitButton />

      <p className="text-center mono text-[10px] text-subtle">
        Sem cobrança agora · pagamento na barbearia
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  placeholder,
  error,
  required,
  mono,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
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
        name={id}
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
