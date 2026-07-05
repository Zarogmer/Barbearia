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
import { MESSAGE_PLACEHOLDERS } from "@/lib/messages-shared";
import { cn } from "@/lib/utils";

import { saveMessageTemplateAction } from "./actions";
import { initialMessageTemplateState, type MessageTemplateState } from "./state";

type Props = {
  mode: "create" | "edit";
  defaults?: {
    id: string;
    title: string;
    body: string;
    key: string | null;
    active: boolean;
  };
};

export function TemplateFormDialog({ mode, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(defaults?.active ?? true);
  const [body, setBody] = useState(defaults?.body ?? "");
  const [state, dispatch] = useActionState<MessageTemplateState, FormData>(
    saveMessageTemplateAction,
    initialMessageTemplateState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  function insertPlaceholder(p: string) {
    setBody((prev) => `${prev}{${p}}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <button
            type="button"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Novo template
          </button>
        ) : (
          <button
            type="button"
            aria-label="Editar"
            className="tap rounded-md p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "create" ? "Novo template" : "Editar template"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Use {"{placeholders}"} pra inserir dados do cliente automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-4">
            {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

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
              id="title"
              label="Título *"
              defaultValue={defaults?.title}
              placeholder="Ex: Confirmar agendamento"
              required
              error={state.fieldErrors?.title}
            />

            <div>
              <label
                htmlFor="body"
                className="mono mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Mensagem *
              </label>
              <textarea
                id="body"
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={2000}
                required
                aria-invalid={!!state.fieldErrors?.body}
                placeholder="Oi {nome}! Confirmo seu horário dia {data} às {hora}…"
                className={cn(
                  "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition-all",
                  state.fieldErrors?.body
                    ? "border-danger"
                    : "border-line focus:border-brand focus:shadow-glow",
                )}
              />
              {state.fieldErrors?.body && (
                <p className="mt-1 text-[11px] text-danger">{state.fieldErrors.body}</p>
              )}
            </div>

            <div>
              <div className="mono mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                Inserir placeholder
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    className="tap mono rounded-md bg-surface-2 px-2.5 py-1 text-[11px] text-ink transition-colors hover:bg-brand-soft hover:text-brand"
                  >
                    {"{" + p + "}"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
              <label htmlFor="active" className="cursor-pointer text-sm">
                <div className="font-semibold">Ativo</div>
                <div className="text-xs text-subtle">
                  Templates inativos não aparecem no seletor de envio.
                </div>
              </label>
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <input type="hidden" name="active" value={active ? "true" : "false"} />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-line bg-surface px-6 py-3 sm:gap-2">
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
        pending ? "cursor-wait opacity-75" : "hover:-translate-y-px hover:shadow-lg",
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Salvar
    </button>
  );
}

function Field({
  id,
  label,
  defaultValue,
  placeholder,
  required,
  error,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mono mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-subtle"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
          error ? "border-danger" : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
