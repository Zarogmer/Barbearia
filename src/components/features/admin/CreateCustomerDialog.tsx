"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";

import { createCustomerAction } from "@/app/admin/clientes/actions";
import {
  initialCreateCustomerState,
  type CreateCustomerState,
} from "@/app/admin/clientes/state";
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

export function CreateCustomerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useActionState<CreateCustomerState, FormData>(
    createCustomerAction,
    initialCreateCustomerState,
  );

  useEffect(() => {
    if (state.ok && state.userId) {
      setOpen(false);
      router.push(`/admin/clientes/${state.userId}`);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <UserPlus className="h-4 w-4" />
          Cadastrar cliente
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UserPlus className="h-4 w-4" />
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            Novo cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Cadastro manual avulso. Não precisa de agendamento — o cliente já
            aparece na lista. Email é opcional.
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

          <Field
            id="name"
            label="Nome *"
            required
            placeholder="João da Silva"
            error={state.fieldErrors?.name}
          />
          <Field
            id="phone"
            label="WhatsApp / Telefone"
            placeholder="(11) 91234-5678"
            error={state.fieldErrors?.phone}
            type="tel"
            inputMode="tel"
          />
          <Field
            id="email"
            label="Email (opcional)"
            placeholder="joao@email.com"
            type="email"
            error={state.fieldErrors?.email}
          />
          <Field
            id="birthDate"
            label="Aniversário (opcional)"
            type="date"
            error={state.fieldErrors?.birthDate}
          />

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
          Cadastrando…
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Cadastrar
        </>
      )}
    </button>
  );
}

function Field({
  id,
  label,
  placeholder,
  required,
  type = "text",
  inputMode,
  error,
}: {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  inputMode?: "text" | "tel" | "email";
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
        inputMode={inputMode}
        placeholder={placeholder}
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
