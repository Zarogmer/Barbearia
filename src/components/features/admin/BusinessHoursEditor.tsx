"use client";

import { useState } from "react";

import type { BusinessHours, HoursBlock, Weekday } from "@/lib/business-hours";
import { WEEKDAYS, WEEKDAY_LABEL } from "@/lib/business-hours";
import { cn } from "@/lib/utils";

type Props = {
  initial: BusinessHours | null;
  hiddenInputName?: string;
};

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(h)}:${pad2(mm)}`;
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function hhmmToMinutes(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  if (h < 0 || h > 24 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function defaultBlock(): HoursBlock {
  return { open: 9 * 60, close: 19 * 60 };
}

export function BusinessHoursEditor({
  initial,
  hiddenInputName = "businessHours",
}: Props) {
  const [hours, setHours] = useState<BusinessHours>(initial ?? {});

  function toggleDay(day: Weekday) {
    setHours((prev) => {
      const next = { ...prev };
      if (next[day]) {
        next[day] = null;
      } else {
        next[day] = defaultBlock();
      }
      return next;
    });
  }

  function setBlock(day: Weekday, key: "open" | "close", value: string) {
    const minutes = hhmmToMinutes(value);
    if (minutes === null) return;
    setHours((prev) => {
      const cur = prev[day] ?? defaultBlock();
      return { ...prev, [day]: { ...cur, [key]: minutes } };
    });
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {WEEKDAYS.map((day) => {
          const block = hours[day];
          const isOpen = !!block;
          return (
            <div
              key={day}
              className={cn(
                "flex items-center gap-3 rounded-md border bg-surface p-2.5",
                isOpen ? "border-line" : "border-line/60",
              )}
            >
              <button
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={isOpen}
                className={cn(
                  "tap inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                  isOpen ? "bg-brand" : "bg-surface-3",
                )}
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full bg-surface shadow-sm transition-transform",
                    isOpen ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
              <div className="w-20 shrink-0 text-sm font-medium">
                {WEEKDAY_LABEL[day]}
              </div>
              {isOpen ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="time"
                    value={minutesToHHMM(block!.open)}
                    onChange={(e) => setBlock(day, "open", e.target.value)}
                    className="mono h-9 flex-1 rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
                  />
                  <span className="text-xs text-subtle">até</span>
                  <input
                    type="time"
                    value={minutesToHHMM(block!.close)}
                    onChange={(e) => setBlock(day, "close", e.target.value)}
                    className="mono h-9 flex-1 rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
                  />
                </div>
              ) : (
                <div className="flex-1 text-xs text-subtle">Fechado</div>
              )}
            </div>
          );
        })}
      </div>
      <input type="hidden" name={hiddenInputName} value={JSON.stringify(hours)} />
    </div>
  );
}
