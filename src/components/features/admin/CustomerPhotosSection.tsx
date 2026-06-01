"use client";

import { useState, useTransition } from "react";
import {
  Camera,
  Filter,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import {
  addCustomerPhotoAction,
  deleteCustomerPhotoAction,
} from "@/app/admin/clientes/[id]/photos-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import type { CustomerPhotoRow, PhotoTag } from "@/lib/server/customer-photos";
import { cn } from "@/lib/utils";

type Props = {
  customerUserId: string;
  customerName: string;
  photos: CustomerPhotoRow[];
};

const TAG_LABEL: Record<PhotoTag, string> = {
  BEFORE: "Antes",
  AFTER: "Depois",
  INSPIRATION: "Inspiração",
  OTHER: "Outro",
};

const TAG_TONE: Record<PhotoTag, string> = {
  BEFORE: "bg-subtle/15 text-subtle",
  AFTER: "bg-ok/15 text-ok",
  INSPIRATION: "bg-brand-soft text-brand",
  OTHER: "bg-surface-2 text-subtle",
};

const FILTERS: Array<{ value: PhotoTag | "ALL"; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "BEFORE", label: "Antes" },
  { value: "AFTER", label: "Depois" },
  { value: "INSPIRATION", label: "Inspiração" },
  { value: "OTHER", label: "Outras" },
];

export function CustomerPhotosSection({
  customerUserId,
  customerName,
  photos,
}: Props) {
  const [filter, setFilter] = useState<PhotoTag | "ALL">("ALL");
  const visible = filter === "ALL" ? photos : photos.filter((p) => p.tag === filter);

  return (
    <section className="rounded-md border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Camera className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-display text-sm font-bold">
            Fotos ({photos.length})
          </h2>
        </div>
        <UploadPhotoDialog
          customerUserId={customerUserId}
          customerName={customerName}
        />
      </div>

      {photos.length > 0 && (
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="h-3 w-3 shrink-0 text-subtle" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "tap whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                filter === f.value
                  ? "bg-brand text-brand-fg"
                  : "bg-surface-2 text-subtle hover:bg-surface-3",
              )}
            >
              {f.label}
              {f.value !== "ALL" && (
                <span className="ml-1 opacity-60">
                  ({photos.filter((p) => p.tag === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-xs text-subtle">
          {photos.length === 0
            ? "Nenhuma foto. Tire antes/depois do atendimento pra portfólio."
            : "Nenhuma foto com esse filtro."}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {visible.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              customerUserId={customerUserId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PhotoTile({
  photo,
  customerUserId,
}: {
  photo: CustomerPhotoRow;
  customerUserId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Remover foto?")) return;
    startTransition(async () => {
      const r = await deleteCustomerPhotoAction(photo.id, customerUserId);
      if (r.error) alert(r.error);
    });
  }

  return (
    <li
      className={cn(
        "group relative aspect-square overflow-hidden rounded-md border border-line bg-surface-2",
        pending && "opacity-50",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption ?? TAG_LABEL[photo.tag]}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <span
        className={cn(
          "absolute left-1 top-1 rounded-full px-1.5 py-0.5 mono text-[9px] font-semibold uppercase tracking-wider",
          TAG_TONE[photo.tag],
        )}
      >
        {TAG_LABEL[photo.tag]}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        aria-label="Remover"
        className="tap absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-danger/80 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </button>
      {photo.caption && (
        <p className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          {photo.caption}
        </p>
      )}
    </li>
  );
}

function UploadPhotoDialog({
  customerUserId,
  customerName,
}: {
  customerUserId: string;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState<PhotoTag>("AFTER");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    // ImageUpload escreve em hidden input[name="photoUrl"]. Le direto do DOM.
    const hidden = document.querySelector<HTMLInputElement>(
      'input[name="photoUrl"]',
    );
    const url = hidden?.value?.trim() ?? "";
    if (!url || !url.startsWith("http")) {
      setError("Faça upload ou cole uma URL válida primeiro.");
      return;
    }
    startTransition(async () => {
      const r = await addCustomerPhotoAction(customerUserId, {
        url,
        tag,
        caption: caption || undefined,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setCaption("");
      setTag("AFTER");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="tap inline-flex h-8 items-center gap-1 rounded-md bg-brand px-3 text-xs font-semibold text-brand-fg hover:opacity-90"
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            Adicionar foto
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Pra {customerName}. Pegue consentimento se for usar em marketing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <Upload className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <ImageUpload
            name="photoUrl"
            label="Foto"
            aspectRatio={1}
            hint="Quadrada fica melhor na galeria."
          />

          <div>
            <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Tipo
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["BEFORE", "AFTER", "INSPIRATION", "OTHER"] as PhotoTag[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={cn(
                      "tap rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors",
                      tag === t
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line bg-surface text-subtle hover:bg-surface-2",
                    )}
                  >
                    {TAG_LABEL[t]}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="caption"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Legenda (opcional)
            </label>
            <input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: degradê navalhado"
              maxLength={120}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:shadow-glow"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-line bg-surface px-6 py-3 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm",
              pending
                ? "cursor-wait opacity-60"
                : "hover:-translate-y-px hover:shadow-lg",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

