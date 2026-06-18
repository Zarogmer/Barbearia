"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  forgotPasswordAction,
  initialForgotPasswordState,
  type ForgotPasswordState,
} from "./actions";

export function ForgotPasswordForm() {
  const [state, dispatch] = useActionState<ForgotPasswordState, FormData>(
    forgotPasswordAction,
    initialForgotPasswordState,
  );

  if (state.status === "sent") {
    return (
      <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="space-y-1">
            <p className="font-semibold">Pedido recebido</p>
            <p className="text-xs text-muted-foreground">
              Se existir uma conta com esse email, você vai receber um link
              pra redefinir a senha em alguns segundos. Verifique também o
              spam.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O link expira em 60 minutos e só pode ser usado uma vez.
        </p>
      </div>
    );
  }

  const fieldError =
    state.status === "error" ? state.fieldErrors?.email : undefined;

  return (
    <form action={dispatch} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          aria-invalid={!!fieldError}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
            fieldError ? "border-destructive" : "border-input",
          )}
        />
        {fieldError && (
          <p className="text-xs text-destructive">{fieldError}</p>
        )}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enviando…
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Enviar link pro meu email
        </>
      )}
    </Button>
  );
}
