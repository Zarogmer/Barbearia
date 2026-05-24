import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Check, Clock, User } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { getAppointmentById } from "@/lib/server/appointments";
import { getOrgBySlug } from "@/lib/server/orgs";
import { formatBRL, formatDuration } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const appt = await getAppointmentById(org.id, id);
  if (!appt) notFound();

  const z = toZonedTime(appt.startsAt, org.timezone);
  const dateLabel = z.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: org.timezone,
  });
  const timeLabel = z.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: org.timezone,
  });
  const idShort = appt.id.slice(0, 8);

  const isCancelled = appt.status === "CANCELLED";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12 text-center sm:max-w-2xl">
      <div
        className={
          isCancelled
            ? "mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-3 text-subtle"
            : "animate-pop-check mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg shadow-[hsl(var(--brand)/0.4)]"
        }
      >
        <Check className="h-10 w-10" strokeWidth={3} />
      </div>

      <h1 className="mb-2 font-display text-3xl font-extrabold tracking-tight">
        {isCancelled ? "Agendamento cancelado" : "Confirmado!"}
      </h1>
      <p className="mb-7 max-w-xs text-sm text-subtle">
        {isCancelled
          ? "Esse agendamento foi cancelado. Você pode marcar outro a qualquer momento."
          : "Vamos te esperar. Enviamos os detalhes pro seu email."}
      </p>

      <div className="mb-5 w-full rounded-md border border-line bg-gradient-to-br from-surface to-surface-2 p-5 text-left">
        <div className="mb-4 flex items-center gap-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
          <span
            className={
              isCancelled
                ? "h-2 w-2 rounded-full bg-subtle"
                : "h-2 w-2 rounded-full bg-ok"
            }
          />
          {isCancelled ? "Cancelado" : "Confirmado"} · #{idShort}
        </div>

        <div className="mb-3 flex items-start gap-3">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div>
            <div className="font-display text-base font-bold tracking-tight">
              {appt.service.name}
            </div>
            <div className="mono text-xs capitalize text-subtle">
              {dateLabel} · {timeLabel}
            </div>
          </div>
        </div>
        <div className="mb-3 flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="mono text-xs text-subtle">
            {formatDuration(appt.service.durationMinutes)} ·{" "}
            {formatBRL(appt.service.priceCents)}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="text-xs text-subtle">com {appt.professional.name}</div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <Link
          href={`/${orgSlug}`}
          className="mt-3 text-xs font-medium text-subtle transition-colors hover:text-ink hover:underline underline-offset-4"
        >
          ← voltar para {org.name}
        </Link>
      </div>

      <p className="mt-10 mono text-[10px] text-subtle">
        powered by <span className="text-brand">Lustro</span>
      </p>
    </main>
  );
}
