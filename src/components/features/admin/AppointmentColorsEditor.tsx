"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";

import {
  resetAppointmentColorsAction,
  saveAppointmentColorsAction,
} from "@/app/admin/configuracoes/appointment-colors-action";
import {
  DEFAULT_APPOINTMENT_COLORS,
  readableTextColor,
  type AppointmentColors,
} from "@/lib/appointment-colors";
import { cn } from "@/lib/utils";

type Props = {
  initial: AppointmentColors;
};

const FIELDS: Array<{
  key: keyof AppointmentColors;
  label: string;
  hint: string;
}> = [
  { key: "confirmed", label: "Confirmado", hint: "Agendamento ativo" },
  { key: "completed", label: "Concluído", hint: "Atendimento finalizado" },
  { key: "cancelled", label: "Cancelado", hint: "Cliente desmarcou" },
  { key: "noShow", label: "No-show", hint: "Cliente não apareceu" },
];

export function AppointmentColorsEditor({ initial }: Props) {
  const [colors, setColors] = useState<AppointmentColors>(initial);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    colors.confirmed !== initial.confirmed ||
    colors.completed !== initial.completed ||
    colors.cancelled !== initial.cancelled ||
    colors.noShow !== initial.noShow;

  function handleChange(key: keyof AppointmentColors, value: string) {
    setColors((c) => ({ ...c, [key]: value }));
    setSavedAt(null);
    setError(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const r = await saveAppointmentColorsAction(colors);
      if (r.ok) setSavedAt(Date.now());
      else setError(r.error);
    });
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const r = await resetAppointmentColorsAction();
      if (r.ok) {
        setColors(DEFAULT_APPOINTMENT_COLORS);
        setSavedAt(Date.now());
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 font-display text-base font-bold">
          Cores dos agendamentos
        </h3>
        <p className="text-xs text-subtle">
          Cores aplicadas nos blocos da agenda por status. Mude pra alinhar
          com o seu padrão visual.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const value = colors[f.key];
          const text = readableTextColor(value);
          return (
            <div
              key={f.key}
              className="rounded-md border border-line bg-surface p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{f.label}</div>
                  <div className="text-[10px] text-subtle">{f.hint}</div>
                </div>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: value, color: text }}
                >
                  {f.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-line bg-surface"
                  aria-label={`Cor ${f.label}`}
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleChange(f.key, v);
                  }}
                  className="mono h-9 flex-1 rounded-md border border-line bg-surface px-2 text-xs outline-none focus:border-brand"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="tap inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-subtle transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Voltar ao padrão
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isPending}
          className={cn(
            "tap inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-all",
            dirty && !isPending
              ? "bg-ink text-surface shadow-sm hover:-translate-y-px hover:shadow-md"
              : "cursor-not-allowed bg-surface-2 text-subtle",
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : savedAt ? (
            <>
              <Check className="h-4 w-4" />
              Salvo
            </>
          ) : (
            "Salvar cores"
          )}
        </button>
      </div>
    </div>
  );
}
