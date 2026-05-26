"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Star } from "lucide-react";

import { createReviewAction } from "@/app/(public)/[orgSlug]/conta/historico/actions";
import {
  initialReviewState,
  type ReviewActionState,
} from "@/app/(public)/[orgSlug]/conta/historico/state";
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
  orgSlug: string;
  appointmentId: string;
  serviceName: string;
  professionalName: string;
};

export function ReviewDialog({
  orgSlug,
  appointmentId,
  serviceName,
  professionalName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const action = createReviewAction.bind(null, orgSlug, appointmentId);
  const [state, dispatch] = useActionState<ReviewActionState, FormData>(
    action,
    initialReviewState,
  );

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setRating(0);
    }
  }, [state.ok]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setRating(0);
          setHoverRating(0);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand/30 bg-brand-soft px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
        >
          <Star className="h-3.5 w-3.5" />
          Avaliar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Como foi seu atendimento?
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            {serviceName} com {professionalName}
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-4">
          <input type="hidden" name="rating" value={rating} />

          {state.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= (hoverRating || rating);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      filled
                        ? "fill-warn text-warn"
                        : "fill-transparent text-line",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {state.fieldErrors?.rating && (
            <p className="text-center text-[11px] text-danger">
              {state.fieldErrors.rating}
            </p>
          )}

          <div>
            <label
              htmlFor="comment"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Comentário (opcional)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              maxLength={500}
              placeholder="Conta como foi a experiência…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
            />
            {state.fieldErrors?.comment && (
              <p className="mt-1 text-[11px] text-danger">{state.fieldErrors.comment}</p>
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
            <SubmitButton disabled={rating === 0} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
        pending || disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando…
        </>
      ) : (
        <>
          <Star className="h-4 w-4" />
          Enviar avaliação
        </>
      )}
    </button>
  );
}
