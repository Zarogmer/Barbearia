"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Image as ImageIcon, Loader2, Plus } from "lucide-react";

import { createPostAction } from "@/app/admin/feed/actions";
import {
  initialPostState,
  type PostActionState,
} from "@/app/admin/feed/state";
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

export function NewPostDialog() {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, dispatch] = useActionState<PostActionState, FormData>(
    createPostAction,
    initialPostState,
  );

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setPreviewUrl("");
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Novo post
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ImageIcon className="h-4 w-4" />
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            Publicar no feed
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Cole a URL de uma imagem (Instagram, Imgur, Drive, etc.). Upload
            direto virá em versão futura.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-3.5">
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
              htmlFor="imageUrl"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              URL da imagem *
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              required
              placeholder="https://..."
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              aria-invalid={!!state.fieldErrors?.imageUrl}
              className={cn(
                "h-11 w-full rounded-lg border bg-surface px-3.5 mono text-sm outline-none transition-all",
                state.fieldErrors?.imageUrl
                  ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
                  : "border-line focus:border-brand focus:shadow-glow",
              )}
            />
            {state.fieldErrors?.imageUrl && (
              <p className="mt-1 text-[11px] text-danger">
                {state.fieldErrors.imageUrl}
              </p>
            )}
          </div>

          {previewUrl && /^https?:\/\/.+/.test(previewUrl) && (
            <div className="overflow-hidden rounded-md border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="aspect-square w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="caption"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Legenda (opcional)
            </label>
            <textarea
              id="caption"
              name="caption"
              rows={3}
              maxLength={280}
              placeholder="Descreva o post…"
              className={cn(
                "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition-all",
                state.fieldErrors?.caption
                  ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
                  : "border-line focus:border-brand focus:shadow-glow",
              )}
            />
            {state.fieldErrors?.caption && (
              <p className="mt-1 text-[11px] text-danger">
                {state.fieldErrors.caption}
              </p>
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
          Publicando…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Publicar
        </>
      )}
    </button>
  );
}
