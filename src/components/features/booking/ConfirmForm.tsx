"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Phone, RotateCw } from "lucide-react";

import {
  requestOtpAction,
  verifyOtpAction,
} from "@/app/(public)/[orgSlug]/agendar/confirmar/actions";
import {
  initialConfirmBookingState,
  type ConfirmBookingState,
} from "@/app/(public)/[orgSlug]/agendar/confirmar/state";
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
};

const RESEND_COOLDOWN_SEC = 60;

export function ConfirmForm({ ctx, defaultName }: Props) {
  const [state, dispatch] = useActionState<ConfirmBookingState, FormData>(
    (prev, fd) =>
      prev.step === "verify" ? verifyOtpAction(prev, fd) : requestOtpAction(prev, fd),
    initialConfirmBookingState,
  );

  return state.step === "verify" ? (
    <VerifyStep ctx={ctx} state={state} dispatch={dispatch} />
  ) : (
    <RequestStep ctx={ctx} state={state} dispatch={dispatch} defaultName={defaultName} />
  );
}

// ─── Etapa 1: nome + telefone ───────────────────────────────────────

function RequestStep({
  ctx,
  state,
  dispatch,
  defaultName,
}: {
  ctx: Props["ctx"];
  state: Extract<ConfirmBookingState, { step: "request" }>;
  dispatch: (fd: FormData) => void;
  defaultName?: string;
}) {
  return (
    <form action={dispatch} className="space-y-3.5">
      <input type="hidden" name="orgSlug" value={ctx.orgSlug} />
      <input type="hidden" name="serviceId" value={ctx.serviceId} />
      <input type="hidden" name="professionalId" value={ctx.professionalId} />
      <input type="hidden" name="date" value={ctx.date} />
      <input type="hidden" name="time" value={ctx.time} />

      {state.error && !state.fieldErrors && (
        <ErrorAlert message={state.error} />
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
        id="phone"
        label="WhatsApp *"
        type="tel"
        placeholder="(11) 99999-8888"
        mono
        error={state.fieldErrors?.phone}
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
          Aceito receber SMS com código de confirmação e concordo com os{" "}
          <span className="text-ink underline-offset-2 hover:underline">
            termos de cancelamento
          </span>{" "}
          (cancelar até 2h antes).
        </span>
      </label>
      {state.fieldErrors?.acceptedTerms && (
        <p className="text-xs text-danger">{state.fieldErrors.acceptedTerms}</p>
      )}

      <RequestSubmit />

      <p className="text-center mono text-[10px] text-subtle">
        Sem cobrança agora · pagamento na barbearia
      </p>
    </form>
  );
}

function RequestSubmit() {
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
          Enviando código…
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          Enviar código por SMS
        </>
      )}
    </button>
  );
}

// ─── Etapa 2: código OTP ────────────────────────────────────────────

function VerifyStep({
  ctx,
  state,
  dispatch,
}: {
  ctx: Props["ctx"];
  state: Extract<ConfirmBookingState, { step: "verify" }>;
  dispatch: (fd: FormData) => void;
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function handleResend() {
    const fd = new FormData();
    fd.set("orgSlug", ctx.orgSlug);
    fd.set("serviceId", ctx.serviceId);
    fd.set("professionalId", ctx.professionalId);
    fd.set("date", ctx.date);
    fd.set("time", ctx.time);
    fd.set("phone", state.phone);
    fd.set("customerName", state.customerName);
    fd.set("acceptedTerms", "on");
    dispatch(fd);
    setCooldown(RESEND_COOLDOWN_SEC);
  }

  return (
    <form action={dispatch} className="space-y-3.5">
      <input type="hidden" name="orgSlug" value={ctx.orgSlug} />
      <input type="hidden" name="serviceId" value={ctx.serviceId} />
      <input type="hidden" name="professionalId" value={ctx.professionalId} />
      <input type="hidden" name="date" value={ctx.date} />
      <input type="hidden" name="time" value={ctx.time} />
      <input type="hidden" name="phone" value={state.phone} />
      <input type="hidden" name="customerName" value={state.customerName} />

      <div className="rounded-md border border-line bg-surface-2 p-3 text-xs">
        <div className="mono text-[10px] uppercase tracking-wider text-subtle">
          Código enviado pra
        </div>
        <div className="mono font-semibold">{state.phone}</div>
      </div>

      {state.error && <ErrorAlert message={state.error} />}

      <div>
        <label
          htmlFor="code"
          className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
        >
          Código *
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          required
          aria-invalid={!!state.fieldErrors?.code}
          className={cn(
            "mono h-14 w-full rounded-lg border bg-surface px-3.5 text-center text-2xl font-bold tracking-[0.3em] outline-none transition-all",
            state.fieldErrors?.code
              ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
              : "border-line focus:border-brand focus:shadow-glow",
          )}
          placeholder="000000"
        />
        {state.fieldErrors?.code && (
          <p className="mt-1 text-[11px] text-danger">{state.fieldErrors.code}</p>
        )}
      </div>

      <VerifySubmit />

      <button
        type="button"
        disabled={cooldown > 0}
        onClick={handleResend}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 text-xs transition-colors",
          cooldown > 0
            ? "cursor-not-allowed text-subtle"
            : "text-ink underline-offset-2 hover:underline",
        )}
      >
        <RotateCw className="h-3 w-3" />
        {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Não recebi — reenviar"}
      </button>
    </form>
  );
}

function VerifySubmit() {
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

// ─── helpers ────────────────────────────────────────────────────────

function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
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
