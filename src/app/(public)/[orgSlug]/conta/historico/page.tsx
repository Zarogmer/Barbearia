import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, Clock, History, Star, User as UserIcon } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { ReviewDialog } from "@/components/features/customer/ReviewDialog";
import { auth } from "@/lib/auth";
import { getCustomerHistory } from "@/lib/server/customerHistory";
import { getOrgBySlug } from "@/lib/server/orgs";
import { cn, formatBRL, formatDuration } from "@/lib/utils";

const STATUS_TONE = {
  CONFIRMED: "bg-ok/10 text-ok",
  COMPLETED: "bg-brand-soft text-brand",
  CANCELLED: "bg-danger/10 text-danger",
  NO_SHOW: "bg-warn/10 text-warn",
} as const;

const STATUS_LABEL = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
} as const;

function formatHHMM(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

function formatDayLabel(utc: Date, timezone: string): string {
  return utc.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: timezone,
  });
}

export default async function HistoricoTab({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [session, org] = await Promise.all([auth(), getOrgBySlug(orgSlug)]);
  if (!org) notFound();
  if (!session?.user?.id) redirect(`/login?next=/${orgSlug}/conta/historico`);

  const history = await getCustomerHistory(org.id, session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Sua conta</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Histórico
        </h1>
        <p className="text-sm text-subtle">
          {history.total === 0
            ? "Nenhum agendamento ainda."
            : `${history.total} agendamento${history.total !== 1 ? "s" : ""} no total.`}
        </p>
      </header>

      {history.total === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="mb-2 font-display text-base font-bold">
            Sem agendamentos por aqui
          </p>
          <p className="mb-4 text-xs text-subtle">
            Faça seu primeiro agendamento em {org.name}.
          </p>
          <Link
            href={`/${orgSlug}/agendar`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
          >
            Agendar agora
          </Link>
        </div>
      ) : (
        <>
          {history.upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                Agendamento em aberto
              </h2>
              <div className="space-y-2">
                {history.upcoming.map((appt) => (
                  <UpcomingCard
                    key={appt.id}
                    appt={appt}
                    timezone={org.timezone}
                    orgSlug={orgSlug}
                  />
                ))}
              </div>
            </section>
          )}

          {history.byMonth.map((group) => (
            <section key={group.yearMonth}>
              <h2 className="mb-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((appt) => (
                  <HistoryCard
                    key={appt.id}
                    appt={appt}
                    timezone={org.timezone}
                    orgSlug={orgSlug}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function UpcomingCard({
  appt,
  timezone,
  orgSlug,
}: {
  appt: ReturnType<typeof getCustomerHistory> extends Promise<infer T>
    ? T extends { upcoming: (infer U)[] }
      ? U
      : never
    : never;
  timezone: string;
  orgSlug: string;
}) {
  const dayLabel = formatDayLabel(appt.startsAt, timezone);
  const startLabel = formatHHMM(appt.startsAt, timezone);
  const endLabel = formatHHMM(appt.endsAt, timezone);

  return (
    <Link
      href={`/${orgSlug}/agendamento/${appt.id}`}
      className="block rounded-md border border-brand/30 bg-brand-soft p-4 transition-all hover:-translate-y-px hover:shadow-md"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-display text-base font-bold capitalize">
          {dayLabel}
        </span>
        <span className="mono text-xs font-semibold text-brand">
          {startLabel} → {endLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="mono text-[10px] uppercase tracking-wider text-subtle">
            Serviço
          </div>
          <div className="font-semibold">{appt.serviceName}</div>
          <div className="mono text-[11px] text-subtle">
            {formatDuration(appt.serviceDurationMinutes)} · {formatBRL(appt.servicePriceCents)}
          </div>
        </div>
        <div>
          <div className="mono text-[10px] uppercase tracking-wider text-subtle">
            Profissional
          </div>
          <div className="font-semibold">{appt.professionalName}</div>
        </div>
      </div>
    </Link>
  );
}

function HistoryCard({
  appt,
  timezone,
  orgSlug,
}: {
  appt: ReturnType<typeof getCustomerHistory> extends Promise<infer T>
    ? T extends { byMonth: { items: (infer U)[] }[] }
      ? U
      : never
    : never;
  timezone: string;
  orgSlug: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Calendar className="h-3.5 w-3.5 text-subtle" />
            <span className="capitalize">{formatDayLabel(appt.startsAt, timezone)}</span>
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            STATUS_TONE[appt.status],
          )}
        >
          {STATUS_LABEL[appt.status]}
        </span>
      </div>
      <div className="mb-2 inline-flex items-center gap-1.5 mono text-xs text-subtle">
        <Clock className="h-3 w-3" />
        {formatHHMM(appt.startsAt, timezone)} - {formatHHMM(appt.endsAt, timezone)}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="mono text-[10px] uppercase tracking-wider text-subtle">
            Serviço
          </div>
          <div className="font-medium">{appt.serviceName}</div>
        </div>
        <div>
          <div className="inline-flex items-center gap-1 mono text-[10px] uppercase tracking-wider text-subtle">
            <UserIcon className="h-3 w-3" />
            Profissional
          </div>
          <div className="font-medium">{appt.professionalName}</div>
        </div>
      </div>

      {appt.status === "COMPLETED" && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
          {appt.review ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-3.5 w-3.5",
                      n <= appt.review!.rating
                        ? "fill-warn text-warn"
                        : "fill-transparent text-line",
                    )}
                  />
                ))}
              </div>
              <span className="mono text-[10px] uppercase tracking-wider text-subtle">
                Avaliado
              </span>
            </div>
          ) : (
            <>
              <span className="mono text-[10px] uppercase tracking-wider text-subtle">
                Como foi?
              </span>
              <ReviewDialog
                orgSlug={orgSlug}
                appointmentId={appt.id}
                serviceName={appt.serviceName}
                professionalName={appt.professionalName}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
