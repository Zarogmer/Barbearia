import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { AgendaFiltersSheet } from "@/components/features/admin/AgendaFiltersSheet";
import { AgendaGrid } from "@/components/features/admin/AgendaGrid";
import { AgendaMonthView } from "@/components/features/admin/AgendaMonthView";
import { AgendaWeekView } from "@/components/features/admin/AgendaWeekView";
import { QuickBookingDialog } from "@/components/features/admin/QuickBookingDialog";
import { auth } from "@/lib/auth";
import { getAppointmentColors } from "@/lib/server/appointment-colors";
import { getDayAgenda } from "@/lib/server/agenda";
import { getMonthAgenda, getWeekAgenda } from "@/lib/server/agenda-range";
import { listActiveServices } from "@/lib/server/services-public";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";


function todayIsoIn(timezone: string): string {
  const now = toZonedTime(new Date(), timezone);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d!);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function localMinutesIn(utc: Date, timezone: string): number {
  const z = toZonedTime(utc, timezone);
  return z.getHours() * 60 + z.getMinutes();
}

function formatDateLabel(iso: string, timezone: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d!, 12, 0);
  return dt.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  });
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; prof?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/agenda");

  const membership = session.user.memberships[0];
  if (!membership) {
    return (
      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você não pertence a nenhuma organização.
        </p>
      </div>
    );
  }
  const canManageAll = membership.role === "OWNER";

  const sp = await searchParams;
  const view: ViewMode =
    sp.view === "week" || sp.view === "month" ? sp.view : "day";
  // Quando date não vem, busca uma vez pra descobrir timezone e refaz com hoje
  // real no fuso da org. ±24h de folga no SQL absorve a primeira aproximação.
  const dateInput =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : new Date().toISOString().slice(0, 10);

  const initialAgenda = await getDayAgenda({
    organizationId: membership.organizationId,
    date: dateInput,
    onlyProfessionalId: canManageAll
      ? undefined
      : membership.professionalId ?? undefined,
  });

  const date =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : todayIsoIn(initialAgenda.timezone);

  const finalAgenda =
    date === dateInput
      ? initialAgenda
      : await getDayAgenda({
          organizationId: membership.organizationId,
          date,
          onlyProfessionalId: canManageAll
            ? undefined
            : membership.professionalId ?? undefined,
        });

  const [services, apptColors] = await Promise.all([
    canManageAll
      ? listActiveServices(membership.organizationId)
      : Promise.resolve([]),
    getAppointmentColors(membership.organizationId),
  ]);

  const prevDate = isoAddDays(date, -1);
  const nextDate = isoAddDays(date, 1);
  const todayIso = todayIsoIn(finalAgenda.timezone);
  const isToday = date === todayIso;
  const nowMinutes = isToday ? localMinutesIn(new Date(), finalAgenda.timezone) : -1;

  // PBI-43: filtro por profissional via ?prof=<id> (OWNER pode aplicar;
  // STAFF já cai pra seu próprio prof via onlyProfessionalId).
  const profFilterId =
    canManageAll && sp.prof && finalAgenda.professionals.some((p) => p.id === sp.prof)
      ? sp.prof
      : null;
  const visibleProfessionals = profFilterId
    ? finalAgenda.professionals.filter((p) => p.id === profFilterId)
    : finalAgenda.professionals;

  return (
    <div className="flex h-full flex-col p-4 lg:p-8">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
            <Link
              href={`/admin/agenda?date=${prevDate}`}
              className="rounded-md p-1.5 transition-colors hover:bg-surface-2"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="mono px-2 text-sm font-bold capitalize">
              {formatDateLabel(date, finalAgenda.timezone)}
            </span>
            <Link
              href={`/admin/agenda?date=${nextDate}`}
              className="rounded-md p-1.5 transition-colors hover:bg-surface-2"
              aria-label="Próximo dia"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {!isToday && (
            <Link
              href="/admin/agenda"
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-semibold leading-9 transition-colors hover:bg-surface-2"
            >
              Hoje
            </Link>
          )}
          <div className="flex overflow-hidden rounded-lg border border-line bg-surface">
            {(["day", "week", "month"] as const).map((v) => {
              const label = v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês";
              const active = view === v;
              const params = new URLSearchParams();
              params.set("view", v);
              params.set("date", date);
              if (profFilterId) params.set("prof", profFilterId);
              return (
                <Link
                  key={v}
                  href={`/admin/agenda?${params.toString()}`}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-ink text-[hsl(var(--surface))]"
                      : "text-subtle hover:bg-surface-2",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageAll && (
            <AgendaFiltersSheet
              currentDate={date}
              currentProfId={profFilterId}
              professionals={finalAgenda.professionals.map((p) => ({
                id: p.id,
                name: p.name,
                appointmentsCount: p.appointmentsCount,
              }))}
            />
          )}
          {canManageAll && (
            <QuickBookingDialog
              date={date}
              professionals={visibleProfessionals.map((p) => ({ id: p.id, name: p.name }))}
              services={services.map((s) => ({
                id: s.id,
                name: s.name,
                durationMinutes: s.durationMinutes,
              }))}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-md border border-line bg-surface">
        {view === "day" && (
          <AgendaGrid
            professionals={visibleProfessionals.map((p) => ({
              id: p.id,
              name: p.name,
              appointmentsCount: p.appointmentsCount,
            }))}
            appointments={finalAgenda.appointments.map((a) => ({
              id: a.id,
              professionalId: a.professionalId,
              startsAtIso: a.startsAt.toISOString(),
              endsAtIso: a.endsAt.toISOString(),
              status: a.status,
              customerName: a.customerName,
              customerPhone: a.customerPhone,
              serviceName: a.serviceName,
              serviceDurationMinutes: a.serviceDurationMinutes,
              servicePriceCents: a.servicePriceCents,
              professionalName: a.professionalName,
            }))}
            blocks={finalAgenda.blocks.map((b) => ({
              id: b.id,
              professionalId: b.professionalId,
              startsAtIso: b.startsAt.toISOString(),
              endsAtIso: b.endsAt.toISOString(),
              reason: b.reason,
            }))}
            timezone={finalAgenda.timezone}
            nowMinutes={nowMinutes}
            colors={apptColors}
          />
        )}
        {view === "week" && (
          <AgendaWeekContent
            organizationId={membership.organizationId}
            date={date}
            profFilterId={profFilterId}
            colors={apptColors}
          />
        )}
        {view === "month" && (
          <AgendaMonthContent
            organizationId={membership.organizationId}
            date={date}
            profFilterId={profFilterId}
          />
        )}
      </div>

      <p className="mono mt-3 text-[10px] uppercase tracking-wider text-subtle">
        Legenda · <span className="rounded bg-brand/15 px-1.5 py-0.5 text-ink">confirmado</span>
        {" · "}
        clique num bloco para detalhes
        {canManageAll && " · clique em + Novo para encaixe"}
      </p>
    </div>
  );
}

async function AgendaWeekContent({
  organizationId,
  date,
  profFilterId,
  colors,
}: {
  organizationId: string;
  date: string;
  profFilterId: string | null;
  colors: Awaited<ReturnType<typeof getAppointmentColors>>;
}) {
  const week = await getWeekAgenda({
    organizationId,
    dateIso: date,
    ...(profFilterId ? { onlyProfessionalId: profFilterId } : {}),
  });
  return (
    <AgendaWeekView
      weekStart={week.weekStart}
      timezone={week.timezone}
      colors={colors}
      appointments={week.appointments.map((a) => ({
        id: a.id,
        startsAtIso: a.startsAt.toISOString(),
        endsAtIso: a.endsAt.toISOString(),
        status: a.status,
        customerName: a.customerName,
        serviceName: a.serviceName,
        servicePriceCents: a.servicePriceCents,
        professionalId: a.professionalId,
        professionalName: a.professionalName,
      }))}
    />
  );
}

async function AgendaMonthContent({
  organizationId,
  date,
  profFilterId,
}: {
  organizationId: string;
  date: string;
  profFilterId: string | null;
}) {
  const [y, m] = date.split("-").map(Number);
  const month = await getMonthAgenda({
    organizationId,
    year: y!,
    month: m!,
    ...(profFilterId ? { onlyProfessionalId: profFilterId } : {}),
  });
  return (
    <AgendaMonthView
      year={month.year}
      month={month.month}
      daysSummary={month.daysSummary}
    />
  );
}
