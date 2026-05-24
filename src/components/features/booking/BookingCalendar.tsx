"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Calendar } from "@/components/ui/calendar";

type Props = {
  basePath: string; // ex: /barbearia-demo/agendar/horario
  baseQuery: string; // ex: serviceId=X&professionalId=Y
  selectedDate: string | undefined; // YYYY-MM-DD local
  maxDaysAhead: number; // RN-06: 60
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d!);
}

export function BookingCalendar({
  basePath,
  baseQuery,
  selectedDate,
  maxDaysAhead,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDaysAhead);

  return (
    <div
      className="rounded-md border border-line bg-surface p-2 transition-opacity"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <Calendar
        mode="single"
        selected={selectedDate ? fromIsoDate(selectedDate) : undefined}
        onSelect={(d) => {
          if (!d) return;
          startTransition(() => {
            router.replace(`${basePath}?${baseQuery}&date=${toIsoDate(d)}`);
          });
        }}
        disabled={{ before: today, after: maxDate }}
        showOutsideDays={false}
      />
    </div>
  );
}
