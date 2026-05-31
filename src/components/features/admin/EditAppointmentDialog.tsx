"use client";

import { useState, useTransition } from "react";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { AlertCircle, Loader2, Save } from "lucide-react";

import { updateAppointmentAction } from "@/app/admin/agenda/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  appointment: {
    id: string;
    customerName: string;
    serviceName: string;
    startsAtIso: string; // UTC
    notes?: string | null;
  };
  timezone: string;
  open: boolean;
  onClose: () => void;
};

function localDateTimeParts(utcIso: string, timezone: string) {
  const zoned = toZonedTime(new Date(utcIso), timezone);
  const yyyy = zoned.getFullYear();
  const mm = String(zoned.getMonth() + 1).padStart(2, "0");
  const dd = String(zoned.getDate()).padStart(2, "0");
  const hh = String(zoned.getHours()).padStart(2, "0");
  const min = String(zoned.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

export function EditAppointmentDialog({
  appointment,
  timezone,
  open,
  onClose,
}: Props) {
  const initial = localDateTimeParts(appointment.startsAtIso, timezone);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const startsAtUtc = fromZonedTime(`${date}T${time}:00`, timezone);
    if (Number.isNaN(startsAtUtc.getTime())) {
      setError("Data/hora inválida.");
      return;
    }
    startTransition(async () => {
      const result = await updateAppointmentAction(appointment.id, {
        startsAt: startsAtUtc.toISOString(),
        notes: notes.trim() || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Editar agendamento
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            {appointment.customerName} · {appointment.serviceName}. Pra mudar o
            serviço ou profissional, cancele e crie um novo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-date"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Data
              </label>
              <input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mono h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
              />
            </div>
            <div>
              <label
                htmlFor="edit-time"
                className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
              >
                Hora
              </label>
              <input
                id="edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mono h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Observação
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Voltar
            </button>
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
