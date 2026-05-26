"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { updateCustomerProfileAction } from "@/app/(public)/[orgSlug]/conta/perfil/actions";
import {
  initialProfileState,
  type ProfileActionState,
} from "@/app/(public)/[orgSlug]/conta/perfil/state";
import { cn } from "@/lib/utils";

type Props = {
  defaultName: string;
  defaultPhone: string;
};

export function CustomerProfileForm({ defaultName, defaultPhone }: Props) {
  const [state, dispatch] = useActionState<ProfileActionState, FormData>(
    updateCustomerProfileAction,
    initialProfileState,
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
      {state.ok && (
        <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/5 p-3 text-xs text-ok">
          <Check className="h-4 w-4" />
          Perfil atualizado.
        </div>
      )}

      <Field
        id="name"
        label="Nome *"
        defaultValue={defaultName}
        required
        error={state.fieldErrors?.name}
      />
      <Field
        id="phone"
        label="WhatsApp"
        type="tel"
        defaultValue={defaultPhone}
        placeholder="(11) 99999-8888"
        mono
        error={state.fieldErrors?.phone}
      />

      <SaveButton />
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
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
        <>
          <Check className="h-4 w-4" />
          Salvar alterações
        </>
      )}
    </button>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required,
  error,
  mono,
}: {
  id: string;
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
