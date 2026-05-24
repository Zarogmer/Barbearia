"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { deactivateServiceAction } from "@/app/admin/servicos/actions";
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

type Props = {
  serviceId: string;
  serviceName: string;
};

export function DeactivateServiceButton({ serviceId, serviceName }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateServiceAction(serviceId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Remover ${serviceName}`}
          className="rounded-md p-2 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="font-display text-base font-bold">
            Remover <span className="text-danger">{serviceName}</span>?
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Se houver agendamentos vinculados, o serviço fica apenas inativo
            (não aparece no fluxo) — histórico preservado. Senão, é removido
            de vez.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-2.5 text-xs text-danger">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-semibold text-white shadow-sm transition-all",
              isPending
                ? "cursor-wait opacity-75"
                : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removendo…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remover
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
