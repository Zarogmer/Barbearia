"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Settings2 } from "lucide-react";

import { createMovementAction } from "@/app/admin/estoque/actions";
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

type Type = "IN" | "OUT" | "ADJUST";
type Props = {
  productId: string;
  productName: string;
  currentStock: number;
};

const TYPE_LABEL: Record<Type, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUST: "Ajuste",
};

export function InventoryMovementDialog({
  productId,
  productName,
  currentStock,
}: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Type>("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createMovementAction({
        productId,
        type,
        quantity,
        reason: reason.trim() || undefined,
      });
      if ("ok" in r) {
        setOpen(false);
        setQuantity(1);
        setReason("");
        setType("IN");
      } else {
        setError(r.error);
      }
    });
  }

  const preview =
    type === "IN"
      ? currentStock + quantity
      : type === "OUT"
        ? currentStock - quantity
        : quantity;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Movimentar estoque de ${productName}`}
          className="tap inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[10px] font-semibold text-subtle transition-colors hover:border-brand hover:text-ink"
        >
          <ArrowUp className="h-3 w-3" />
          <ArrowDown className="h-3 w-3" />
          Mover
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold">
            Movimentar estoque
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            <span className="font-semibold text-ink">{productName}</span> ·
            estoque atual:{" "}
            <span className="mono font-semibold text-ink">{currentStock}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            {(["IN", "OUT", "ADJUST"] as Type[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "tap inline-flex h-10 items-center justify-center gap-1 rounded-md border text-xs font-semibold transition-all",
                  t === type
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-surface text-subtle hover:border-brand/60",
                )}
              >
                {t === "IN" && <ArrowUp className="h-3.5 w-3.5" />}
                {t === "OUT" && <ArrowDown className="h-3.5 w-3.5" />}
                {t === "ADJUST" && <Settings2 className="h-3.5 w-3.5" />}
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
              {type === "ADJUST" ? "Novo estoque" : "Quantidade"}
            </label>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
              className="mono h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
            />
          </div>

          <div>
            <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Motivo (opcional)
            </label>
            <input
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: compra fornecedor X / contagem semanal"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
            />
          </div>

          <div className="rounded-md border border-line bg-surface-2 p-2.5">
            <div className="mono text-[10px] uppercase tracking-wider text-subtle">
              Após movimentação
            </div>
            <div
              className={cn(
                "mono text-lg font-bold",
                preview < 0 ? "text-danger" : "text-ink",
              )}
            >
              {preview}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Confirmar"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
