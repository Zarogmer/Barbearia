"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deactivateProductAction } from "@/app/admin/estoque/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { productId: string; productName: string };

export function DeactivateProductButton({ productId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const r = await deactivateProductAction(productId);
      if ("ok" in r) setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Desativar ${productName}`}
        className="tap inline-flex h-8 w-8 items-center justify-center rounded-md text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Desativar produto?
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              <span className="font-semibold text-ink">{productName}</span>{" "}
              não aparecerá mais nas comandas, mas movimentações antigas continuam
              no histórico.
            </DialogDescription>
          </DialogHeader>
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
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-lg disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desativando…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Desativar
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
