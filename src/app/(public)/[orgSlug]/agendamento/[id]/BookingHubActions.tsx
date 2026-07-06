"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  CalendarPlus,
  Loader2,
  MapPin,
  RefreshCcw,
  Share2,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { cancelBookingByCustomerAction } from "./actions";

type Props = {
  orgSlug: string;
  orgName: string;
  orgAddress: string | null;
  appointmentId: string;
  serviceId: string;
  professionalId: string;
  serviceName: string;
  professionalName: string;
  startsAt: string; // ISO
  friendlyDate: string; // pra share
  friendlyTime: string;
  /** true = cancelamento < 2h antes ou depois do inicio, motivo obrigatorio */
  reasonRequired: boolean;
  /** ja esta cancelado — desabilita botoes de acao */
  isCancelled: boolean;
};

export function BookingHubActions({
  orgSlug,
  orgName,
  orgAddress,
  appointmentId,
  serviceId,
  professionalId,
  serviceName,
  professionalName,
  friendlyDate,
  friendlyTime,
  reasonRequired,
  isCancelled,
}: Props) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelPending, startCancel] = useTransition();
  const [shareOk, setShareOk] = useState<string | null>(null);

  const mapsUrl = orgAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orgAddress)}`
    : null;

  const rebookHref = `/${orgSlug}/agendar?serviceId=${serviceId}&professionalId=${professionalId}`;

  const icsHref = `/api/appointments/${appointmentId}/ics`;

  function handleShare() {
    const text = `Meu agendamento em ${orgName}:\n${serviceName} com ${professionalName}\n${friendlyDate} às ${friendlyTime}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/${orgSlug}` : "";
    if (typeof navigator === "undefined") return;
    if (typeof navigator.share === "function") {
      navigator.share({ title: `Agendamento — ${orgName}`, text, url }).catch(() => {});
      return;
    }
    // Fallback: copia texto+link. `?.` cobre browsers sem clipboard API.
    navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => {});
    setShareOk("Copiado!");
    setTimeout(() => setShareOk(null), 2000);
  }

  function submitCancel() {
    setCancelError(null);
    startCancel(async () => {
      const r = await cancelBookingByCustomerAction({
        orgSlug,
        appointmentId,
        reason: reason.trim() || undefined,
      });
      if (!r.ok) {
        setCancelError(r.error);
        return;
      }
      setCancelOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        <a
          href={icsHref}
          className={cn(
            "tap flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand",
            isCancelled && "pointer-events-none opacity-50",
          )}
          aria-disabled={isCancelled}
        >
          <CalendarPlus className="h-4 w-4" />
          Adicionar ao calendário
        </a>

        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "tap flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand",
            )}
          >
            <MapPin className="h-4 w-4" />
            Como chegar
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="tap flex h-11 items-center justify-center gap-1.5 rounded-md border border-dashed border-line bg-surface-2 px-3 text-xs font-semibold text-subtle"
            title="Endereço da barbearia não configurado"
          >
            <MapPin className="h-4 w-4" />
            Endereço indisponível
          </button>
        )}

        <a
          href={rebookHref}
          className={cn(
            "tap flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand",
          )}
        >
          <RefreshCcw className="h-4 w-4" />
          {isCancelled ? "Agendar de novo" : "Reagendar"}
        </a>

        <button
          type="button"
          onClick={handleShare}
          className="tap flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand"
        >
          <Share2 className="h-4 w-4" />
          {shareOk ?? "Compartilhar"}
        </button>
      </div>

      {!isCancelled && (
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className="tap mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/30 bg-danger/5 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Cancelar agendamento
        </button>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Cancelar agendamento?
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              {reasonRequired
                ? "Como falta menos de 2h ou já passou do horário, informe o motivo."
                : "Você pode reagendar depois se mudar de ideia."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label htmlFor="cancel-reason" className="block text-xs font-semibold text-subtle">
              Motivo {reasonRequired ? "*" : "(opcional)"}
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder={
                reasonRequired
                  ? "Ex: Imprevisto de última hora"
                  : "Deixe em branco se não quiser dizer"
              }
            />
            {cancelError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-2 text-xs text-danger"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelPending}
                className="tap inline-flex h-10 flex-1 items-center justify-center rounded-md border border-line bg-surface text-xs font-semibold hover:border-brand"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={cancelPending || (reasonRequired && reason.trim().length < 2)}
                className={cn(
                  "tap inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-danger text-xs font-semibold text-white transition-all",
                  cancelPending || (reasonRequired && reason.trim().length < 2)
                    ? "cursor-not-allowed opacity-60"
                    : "hover:-translate-y-px hover:shadow-lg",
                )}
              >
                {cancelPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
