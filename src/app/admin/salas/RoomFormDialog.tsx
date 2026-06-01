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

import {
  initialRoomFormState,
  saveRoomAction,
  type RoomFormState,
} from "./actions";

type Props = {
  mode: "create" | "edit";
  defaults?: { id: string; name: string; active: boolean };
};

export function RoomFormDialog({ mode, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(defaults?.active ?? true);
  const [state, dispatch] = useActionState<RoomFormState, FormData>(
    saveRoomAction,
    initialRoomFormState,
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
            Nova sala
          </button>
        ) : (
          <button
            type="button"
            aria-label="Editar"
            className="tap rounded-md p-2 text-subtle hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "create" ? "Nova sala/cadeira" : "Editar sala"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Posto de trabalho físico. Ex: &quot;Cadeira 1&quot;, &quot;Sala
            Estética&quot;, &quot;Box 3&quot;.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-3.5">
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

          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Nome *
            </label>
            <input
              id="name"
              name="name"
              defaultValue={defaults?.name}
              placeholder="Ex: Cadeira 1"
              required
              aria-invalid={!!state.fieldErrors?.name}
              className={cn(
                "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
                state.fieldErrors?.name
                  ? "border-danger"
                  : "border-line focus:border-brand focus:shadow-glow",
              )}
            />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-[11px] text-danger">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
            <label htmlFor="active" className="cursor-pointer text-sm">
              <div className="font-semibold">Ativa</div>
              <div className="text-xs text-subtle">
                Inativa não aparece no seletor de agendamento.
              </div>
            </label>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <input
              type="hidden"
              name="active"
              value={active ? "true" : "false"}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
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
      Salvar
    </button>
  );
}
