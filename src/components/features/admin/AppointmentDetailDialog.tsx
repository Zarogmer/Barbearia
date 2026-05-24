"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Phone,
  UserX,
  X,
} from "lucide-react";

import {
  cancelAppointmentAction,
  markCompletedAction,
  markNoShowAction,
} from "@/app/admin/agenda/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatBRL, formatDuration } from "@/lib/utils";

type Status = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

type Props = {
  appointment: {
    id: string;
    customerName: string;
    customerPhone: string | null;
    serviceName: string;
    serviceDurationMinutes: number;
    servicePriceCents: number;
    professionalName: string;
    status: Status;
    startsAtLabel: string; // formatado no fuso da org
    endsAtLabel: string;
  };
  requiresCancelReason: boolean;
  trigger: React.ReactNode;
};

export function AppointmentDetailDialog({ appointment, requiresCancelReason, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok?: boolean; error?: string; fieldErrors?: Record<string, string> }>) {
    setError(null);
    setReasonError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
        if (result.fieldErrors?.reason) setReasonError(result.fieldErrors.reason);
        return;
      }
      setOpen(false);
      // reset interno pra próxima abertura
      setCancelMode(false);
      setReason("");
    });
  }

  function copyContact() {
    if (!appointment.customerPhone) return;
    void navigator.clipboard.writeText(appointment.customerPhone);
  }

  const isFinal = appointment.status !== "CONFIRMED";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setCancelMode(false);
          setReason("");
          setError(null);
          setReasonError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 mono text-[10px] uppercase tracking-wider text-subtle">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                appointment.status === "CONFIRMED" && "bg-ok",
                appointment.status === "CANCELLED" && "bg-danger",
                appointment.status === "COMPLETED" && "bg-brand",
                appointment.status === "NO_SHOW" && "bg-warn",
              )}
            />
            {labelOf(appointment.status)} · #{appointment.id.slice(0, 8)}
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            {appointment.customerName}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            {appointment.serviceName} ·{" "}
            <span className="mono">
              {formatDuration(appointment.serviceDurationMinutes)} ·{" "}
              {formatBRL(appointment.servicePriceCents)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-line bg-surface-2 p-3 text-sm">
          <Row label="Quando" value={`${appointment.startsAtLabel} → ${appointment.endsAtLabel}`} mono />
          <Row label="Profissional" value={appointment.professionalName} />
          {appointment.customerPhone && (
            <div className="flex items-center justify-between">
              <span className="text-subtle">WhatsApp</span>
              <button
                type="button"
                onClick={copyContact}
                className="inline-flex items-center gap-1.5 mono text-xs font-semibold text-ink transition-colors hover:text-brand"
              >
                <Phone className="h-3 w-3" />
                {appointment.customerPhone}
                <Copy className="h-3 w-3 opacity-50" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-2.5 text-xs text-danger"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {cancelMode && (
          <div>
            <label
              htmlFor="cancel-reason"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Motivo {requiresCancelReason ? "*" : "(opcional)"}
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex: cliente solicitou via WhatsApp"
              className={cn(
                "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow",
                reasonError ? "border-danger" : "border-line",
              )}
            />
            {reasonError && <p className="mt-1 text-[11px] text-danger">{reasonError}</p>}
          </div>
        )}

        {isFinal ? (
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Fechar
            </button>
          </DialogFooter>
        ) : cancelMode ? (
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setCancelMode(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => cancelAppointmentAction(appointment.id, reason || undefined, requiresCancelReason))
              }
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-semibold text-white shadow-sm transition-all",
                pending
                  ? "cursor-wait opacity-75"
                  : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Confirmar cancelamento
            </button>
          </DialogFooter>
        ) : (
          <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ActionButton
              icon={<Check className="h-4 w-4" />}
              label="Concluído"
              tone="brand"
              disabled={pending}
              onClick={() => run(() => markCompletedAction(appointment.id))}
            />
            <ActionButton
              icon={<UserX className="h-4 w-4" />}
              label="No-show"
              tone="warn"
              disabled={pending}
              onClick={() => run(() => markNoShowAction(appointment.id))}
            />
            <ActionButton
              icon={<X className="h-4 w-4" />}
              label="Cancelar"
              tone="danger"
              disabled={pending}
              onClick={() => setCancelMode(true)}
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "brand" | "warn" | "danger";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "brand"
      ? "border-brand/30 text-brand hover:bg-brand/10"
      : tone === "warn"
        ? "border-warn/30 text-warn hover:bg-warn/10"
        : "border-danger/30 text-danger hover:bg-danger/10";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border bg-surface px-3 text-xs font-semibold transition-all",
        disabled ? "cursor-wait opacity-60" : "hover:-translate-y-px hover:shadow-sm active:translate-y-0",
        toneClass,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-subtle">{label}</span>
      <span className={cn("font-semibold", mono && "mono")}>{value}</span>
    </div>
  );
}

function labelOf(status: Status): string {
  return {
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
    NO_SHOW: "No-show",
  }[status];
}
