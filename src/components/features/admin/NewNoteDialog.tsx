"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, MessageSquarePlus } from "lucide-react";

import { createNoteAction } from "@/app/admin/clientes/actions";
import {
  initialNoteState,
  type NoteActionState,
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

export function NewNoteDialog({
  customerUserId,
  customerName,
}: {
  customerUserId: string;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  const action = createNoteAction.bind(null, customerUserId);
  const [state, dispatch] = useActionState<NoteActionState, FormData>(
    action,
    initialNoteState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold transition-colors hover:bg-surface-2"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nova anotação
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Anotação sobre {customerName}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Visível apenas pra equipe (não vai pro cliente). Preferências,
            alergias, observações do atendimento.
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

          <div>
            <label
              htmlFor="body"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Anotação *
            </label>
            <textarea
              id="body"
              name="body"
              rows={5}
              required
              maxLength={2000}
              placeholder="Ex: alérgico a amônia, prefere agendar de manhã, gostou do degradê navalhado"
              autoFocus
              className={cn(
                "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition-all",
                state.fieldErrors?.body
                  ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
                  : "border-line focus:border-brand focus:shadow-glow",
              )}
            />
            {state.fieldErrors?.body && (
              <p className="mt-1 text-[11px] text-danger">{state.fieldErrors.body}</p>
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
        "Salvar anotação"
      )}
    </button>
  );
}
