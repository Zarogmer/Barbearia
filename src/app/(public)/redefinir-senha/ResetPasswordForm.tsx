"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  initialResetPasswordState,
  resetPasswordAction,
  type ResetPasswordState,
} from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, dispatch] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    initialResetPasswordState,
  );

  const passwordErr =
    state.status === "error" ? state.fieldErrors?.password : undefined;
  const confirmErr =
    state.status === "error" ? state.fieldErrors?.confirmPassword : undefined;
  const generalErr =
    state.status === "error" && !state.fieldErrors ? state.error : undefined;

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          autoFocus
          aria-invalid={!!passwordErr}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
            passwordErr ? "border-destructive" : "border-input",
          )}
        />
        {passwordErr ? (
          <p className="text-xs text-destructive">{passwordErr}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          aria-invalid={!!confirmErr}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
            confirmErr ? "border-destructive" : "border-input",
          )}
        />
        {confirmErr && <p className="text-xs text-destructive">{confirmErr}</p>}
      </div>

      {generalErr && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{generalErr}</span>
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
          Salvando…
        </>
      ) : (
        <>
          <Check className="mr-2 h-4 w-4" />
          Salvar nova senha
        </>
      )}
    </Button>
  );
}
