"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon, Loader2, Trash2, Upload as UploadIcon, X } from "lucide-react";

import { getUploadSignatureAction } from "@/app/admin/_upload-signature-action";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue?: string | null;
  label?: string;
  hint?: string;
  /** Aspect-ratio hint pro preview. Default 16/9 (cover de barbearia). */
  aspectRatio?: number;
  /** Tamanho máximo em MB. Default 5. */
  maxMB?: number;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUpload({
  name,
  defaultValue = null,
  label,
  hint,
  aspectRatio = 16 / 9,
  maxMB = 5,
}: Props) {
  const [url, setUrl] = useState<string | null>(defaultValue);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reseta pra permitir mesmo arquivo de novo
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Arquivo grande demais (máx ${maxMB}MB).`);
      return;
    }

    startUpload(async () => {
      const sigRes = await getUploadSignatureAction();
      if (!sigRes.ok) {
        setError(sigRes.error);
        return;
      }
      const sig = sigRes.data;
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: "POST", body: form },
        );
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Cloudinary ${res.status}: ${body}`);
        }
        const json = (await res.json()) as { secure_url?: string };
        if (!json.secure_url) throw new Error("Resposta sem URL");
        setUrl(json.secure_url);
      } catch (err) {
        console.error(err);
        setError("Falha ao enviar. Tente de novo ou cole uma URL.");
      }
    });
  }

  function handleRemove() {
    setUrl(null);
    setError(null);
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
          {label}
        </label>
      )}

      {/* Preview ou drop area */}
      {url ? (
        <div className="group relative overflow-hidden rounded-lg border border-line bg-surface-2">
          <div style={{ aspectRatio }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Imagem"
              className="h-full w-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remover imagem"
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink/80 text-surface opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={isUploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-surface-2/40 px-4 transition-colors",
            isUploading
              ? "cursor-wait border-line text-subtle"
              : "border-line text-subtle hover:border-brand hover:bg-brand-soft/40 hover:text-brand",
          )}
          style={{ aspectRatio }}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="mono text-[11px]">Enviando…</span>
            </>
          ) : (
            <>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand">
                <UploadIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">Enviar imagem</span>
              <span className="mono text-[10px]">
                JPG, PNG ou WebP · até {maxMB}MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={handleFileSelected}
      />

      {error && (
        <p className="text-[11px] text-danger">{error}</p>
      )}

      {/* Toggle pra colar URL externa (fallback) */}
      {!showUrlInput ? (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="text-[11px] text-subtle underline-offset-2 hover:text-brand hover:underline"
        >
          ou colar URL externa
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="url"
            placeholder="https://..."
            value={url ?? ""}
            onChange={(e) => setUrl(e.target.value)}
            className="mono h-9 flex-1 rounded-md border border-line bg-surface px-3 text-xs outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(false);
              if (!url?.startsWith("http")) setUrl(null);
            }}
            aria-label="Fechar campo de URL"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-subtle hover:bg-surface-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {hint && !error && (
        <p className="text-[11px] text-subtle">{hint}</p>
      )}

      {/* Hidden field que vai pro form action */}
      <input type="hidden" name={name} value={url ?? ""} />
    </div>
  );
}

/** Placeholder vazio quando não há imagem (uso fora do upload). */
export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-surface-2 text-subtle",
        className,
      )}
    >
      <ImageIcon className="h-8 w-8" />
    </div>
  );
}
