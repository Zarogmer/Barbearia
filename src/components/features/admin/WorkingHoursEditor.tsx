"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Plus, Trash2 } from "lucide-react";

import { setWorkingHoursAction } from "@/app/admin/profissionais/actions";
import {
  initialWorkingHoursState,
  type WorkingHoursActionState,
} from "@/app/admin/profissionais/state";
import { cn } from "@/lib/utils";
import type { WorkingHoursWindow } from "@/lib/validators/professional";

type WeekdayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: "SUN", label: "Domingo" },
  { key: "MON", label: "Segunda" },
  { key: "TUE", label: "Terça" },
  { key: "WED", label: "Quarta" },
  { key: "THU", label: "Quinta" },
  { key: "FRI", label: "Sexta" },
  { key: "SAT", label: "Sábado" },
];

type WindowRow = {
  uid: string; // estável durante a edição
  weekday: WeekdayKey;
  startMinute: number;
  endMinute: number;
};

function minutesToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function hhmmToMinutes(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function makeRow(weekday: WeekdayKey, start = 540, end = 1080): WindowRow {
  return {
    uid: Math.random().toString(36).slice(2),
    weekday,
    startMinute: start,
    endMinute: end,
  };
}

type Props = {
  professionalId: string;
  initialWindows: WorkingHoursWindow[];
};

export function WorkingHoursEditor({ professionalId, initialWindows }: Props) {
  const [rows, setRows] = useState<WindowRow[]>(() =>
    initialWindows.map((w) => ({
      uid: Math.random().toString(36).slice(2),
      weekday: w.weekday as WeekdayKey,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    })),
  );

  const action = setWorkingHoursAction.bind(null, professionalId);
  const [state, dispatch] = useActionState<WorkingHoursActionState, FormData>(
    action,
    initialWorkingHoursState,
  );

  function addRow(weekday: WeekdayKey) {
    setRows((prev) => [...prev, makeRow(weekday)]);
  }
  function removeRow(uid: string) {
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  }
  function updateRow(uid: string, patch: Partial<Pick<WindowRow, "startMinute" | "endMinute">>) {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  return (
    <form action={dispatch} className="space-y-3">
      {state.error && !state.fieldErrors && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/5 p-3 text-xs text-ok">
          <Check className="h-4 w-4" />
          Horários salvos.
        </div>
      )}

      <div className="space-y-2">
        {WEEKDAYS.map(({ key, label }) => {
          const dayRows = rows.filter((r) => r.weekday === key);
          return (
            <div
              key={key}
              className="rounded-lg border border-line bg-surface p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm font-bold">{label}</span>
                <button
                  type="button"
                  onClick={() => addRow(key)}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 mono text-[10px] font-semibold uppercase tracking-wider text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Plus className="h-3 w-3" />
                  Faixa
                </button>
              </div>

              {dayRows.length === 0 ? (
                <p className="mono text-[11px] text-subtle">Fechado</p>
              ) : (
                <div className="space-y-2">
                  {dayRows.map((r) => {
                    const idx = rows.findIndex((x) => x.uid === r.uid);
                    const startErr = state.fieldErrors?.[`${idx}.startMinute`];
                    const endErr = state.fieldErrors?.[`${idx}.endMinute`];
                    return (
                      <div key={r.uid} className="flex items-center gap-2">
                        <input
                          type="hidden"
                          name={`windows[${idx}][weekday]`}
                          value={r.weekday}
                        />
                        <input
                          type="hidden"
                          name={`windows[${idx}][startMinute]`}
                          value={r.startMinute}
                        />
                        <input
                          type="hidden"
                          name={`windows[${idx}][endMinute]`}
                          value={r.endMinute}
                        />

                        <HHMMInput
                          value={minutesToHHMM(r.startMinute)}
                          onChange={(m) => updateRow(r.uid, { startMinute: m })}
                          error={!!startErr}
                        />
                        <span className="mono text-xs text-subtle">→</span>
                        <HHMMInput
                          value={minutesToHHMM(r.endMinute)}
                          onChange={(m) => updateRow(r.uid, { endMinute: m })}
                          error={!!endErr}
                        />
                        <button
                          type="button"
                          aria-label="Remover faixa"
                          onClick={() => removeRow(r.uid)}
                          className="rounded-md p-1.5 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {(startErr || endErr) && (
                          <span className="text-[11px] text-danger">
                            {startErr ?? endErr}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SaveButton />
    </form>
  );
}

function HHMMInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (minutes: number) => void;
  error?: boolean;
}) {
  return (
    <input
      type="time"
      step={300}
      value={value}
      onChange={(e) => {
        const m = hhmmToMinutes(e.target.value);
        if (m !== null) onChange(m);
      }}
      className={cn(
        "h-9 w-[88px] rounded-md border bg-surface px-2 mono text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_3px_hsl(var(--brand)/0.18)]",
        error ? "border-danger" : "border-line",
      )}
    />
  );
}

function SaveButton() {
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
          Salvando…
        </>
      ) : (
        <>
          <Check className="h-4 w-4" />
          Salvar horários
        </>
      )}
    </button>
  );
}
