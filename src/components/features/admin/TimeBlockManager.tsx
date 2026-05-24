"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import {
  createTimeBlockAction,
  deleteTimeBlockAction,
} from "@/app/admin/profissionais/actions";
import {
  initialTimeBlockState,
  type TimeBlockActionState,
} from "@/app/admin/profissionais/state";
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

export type TimeBlockRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

type Props = {
  professionalId: string;
  blocks: TimeBlockRow[];
  timezone: string;
};

export function TimeBlockManager({ professionalId, blocks, timezone }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold">Bloqueios futuros</h3>
          <p className="mono text-[10px] uppercase tracking-wider text-subtle">
            Folga, almoço prolongado, férias
          </p>
        </div>
        <NewTimeBlockDialog professionalId={professionalId} />
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-2 p-6 text-center">
          <p className="font-display text-sm font-bold">Nenhum bloqueio</p>
          <p className="mono text-[10px] uppercase tracking-wider text-subtle">
            adicione quando precisar marcar indisponibilidade
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          {blocks.map((b) => (
            <TimeBlockItem
              key={b.id}
              block={b}
              timezone={timezone}
              professionalId={professionalId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TimeBlockItem({
  block,
  timezone,
  professionalId,
}: {
  block: TimeBlockRow;
  timezone: string;
  professionalId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dateLabel = toZonedTime(block.startsAt, timezone).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  });
  const startLabel = formatHHMM(block.startsAt, timezone);
  const endLabel = formatHHMM(block.endsAt, timezone);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteTimeBlockAction(professionalId, block.id);
      if (r.error) setError(r.error);
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="capitalize font-semibold">{dateLabel}</span>
          <span className="mono text-xs text-subtle">
            {startLabel} → {endLabel}
          </span>
        </div>
        {block.reason && (
          <p className="truncate text-xs text-subtle">{block.reason}</p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-[11px] text-danger">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        aria-label="Remover bloqueio"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors",
          pending
            ? "cursor-wait opacity-60"
            : "hover:border-danger/40 hover:bg-danger/5 hover:text-danger",
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Remover
      </button>
    </li>
  );
}

function NewTimeBlockDialog({ professionalId }: { professionalId: string }) {
  const [open, setOpen] = useState(false);
  const action = createTimeBlockAction.bind(null, professionalId);
  const [state, dispatch] = useActionState<TimeBlockActionState, FormData>(
    action,
    initialTimeBlockState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-surface shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Bloquear
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-warn/15 text-warn">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            Novo bloqueio
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Marca período em que o profissional não atende. Conflito com
            agendamento confirmado é rejeitado.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-3.5">
          {state.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p>{state.error}</p>
                {state.conflictAppointmentIds && state.conflictAppointmentIds.length > 0 && (
                  <p className="mt-1 mono text-[10px]">
                    {state.conflictAppointmentIds.length} agendamento(s) em conflito
                  </p>
                )}
              </div>
            </div>
          )}

          <Field
            id="date"
            label="Data *"
            type="date"
            required
            error={state.fieldErrors?.date}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="startTime"
              label="Início *"
              type="time"
              required
              defaultValue="12:00"
              error={state.fieldErrors?.startTime}
              mono
            />
            <Field
              id="endTime"
              label="Fim *"
              type="time"
              required
              defaultValue="13:00"
              error={state.fieldErrors?.endTime}
              mono
            />
          </div>
          <div>
            <label
              htmlFor="reason"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Motivo (opcional)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={2}
              placeholder="Ex: almoço, consulta médica"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
            />
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
          Criando…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Criar bloqueio
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
  required,
  error,
  mono,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
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

function formatHHMM(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}
