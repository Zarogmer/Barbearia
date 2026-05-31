"use client";

import { useState, useTransition } from "react";
import { Cake, Check, Loader2, Pencil, X } from "lucide-react";

import { setBirthDateAction } from "@/app/admin/clientes/birthday-action";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initial: Date | null;
};

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function BirthDateEditor({ userId, initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ? toIso(initial) : "");
  const [current, setCurrent] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const r = await setBirthDateAction({ userId, birthDate: value });
      if (r.ok) {
        setCurrent(value ? new Date(`${value}T00:00:00Z`) : null);
        setEditing(false);
      } else {
        setError(r.error ?? "Falha ao salvar.");
      }
    });
  }

  function handleCancel() {
    setValue(current ? toIso(current) : "");
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="tap group inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs transition-colors hover:border-brand hover:bg-brand-soft"
      >
        <Cake className="h-3 w-3 text-subtle group-hover:text-brand" />
        <span className={current ? "font-semibold text-ink" : "text-subtle"}>
          {current ? formatBR(current) : "Sem aniversário"}
        </span>
        <Pencil className="h-3 w-3 text-subtle opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="inline-flex items-center gap-1.5">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          max={toIso(new Date())}
          className={cn(
            "mono h-9 rounded-md border bg-surface px-2 text-xs outline-none focus:border-brand focus:shadow-glow",
            error ? "border-danger" : "border-line",
          )}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="tap inline-flex h-9 w-9 items-center justify-center rounded-md bg-ok text-white transition-colors hover:bg-ok/90 disabled:opacity-60"
          aria-label="Salvar"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="tap inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Cancelar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-[11px] text-danger">{error}</p>}
      <p className="text-[10px] text-subtle">
        Vazio = sem aniversário. Ano opcional (não revela idade).
      </p>
    </div>
  );
}
