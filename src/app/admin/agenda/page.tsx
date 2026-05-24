import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { AppointmentDetailDialog } from "@/components/features/admin/AppointmentDetailDialog";
import { QuickBookingDialog } from "@/components/features/admin/QuickBookingDialog";
import { auth } from "@/lib/auth";
import { cancelRequiresReason } from "@/lib/server/booking-service";
import { getDayAgenda } from "@/lib/server/agenda";
import { listActiveServices } from "@/lib/server/services-public";
import { cn } from "@/lib/utils";

const HOUR_START = 9;
const HOUR_END = 19;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.5;

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

function formatHHMMIn(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
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
  searchParams: Promise<{ date?: string }>;
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

  const services = canManageAll ? await listActiveServices(membership.organizationId) : [];

  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  const prevDate = isoAddDays(date, -1);
  const nextDate = isoAddDays(date, 1);
  const todayIso = todayIsoIn(finalAgenda.timezone);
  const isToday = date === todayIso;
  const nowMinutes = isToday ? localMinutesIn(new Date(), finalAgenda.timezone) : -1;

  const visibleProfessionals = finalAgenda.professionals;

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
            <button
              type="button"
              className="bg-ink px-3 py-1.5 text-xs font-semibold text-[hsl(var(--surface))]"
            >
              Dia
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-subtle hover:bg-surface-2"
              disabled
              title="v2"
            >
              Semana
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-subtle hover:bg-surface-2"
              disabled
              title="v2"
            >
              Mês
            </button>
          </div>
        </div>
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

      <div className="flex-1 overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex h-full">
          <div className="w-14 shrink-0 border-r border-line">
            <div className="h-12 border-b border-line bg-surface-2" />
            {hours.map((h) => (
              <div
                key={h}
                className="mono border-b border-line pl-2 pt-1 text-[11px] font-medium text-subtle"
                style={{ height: `${60 * PX_PER_MINUTE}px` }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {visibleProfessionals.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="mono text-[11px] uppercase tracking-wider text-subtle">
                Nenhum profissional ativo
              </p>
            </div>
          ) : (
            <div
              className="grid flex-1 overflow-auto"
              style={{
                gridTemplateColumns: `repeat(${visibleProfessionals.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleProfessionals.map((p) => {
                const apts = finalAgenda.appointments.filter(
                  (a) => a.professionalId === p.id,
                );
                const blocks = finalAgenda.blocks.filter(
                  (b) => b.professionalId === p.id,
                );
                const initials = p.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={p.id} className="border-r border-line last:border-r-0">
                    <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-line bg-surface-2 px-3">
                      <span className="avatar-ring">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                          {initials}
                        </span>
                      </span>
                      <div className="leading-tight">
                        <div className="text-xs font-semibold">{p.name}</div>
                        <div className="mono text-[10px] text-subtle">
                          {p.appointmentsCount} ag
                        </div>
                      </div>
                    </div>

                    <div
                      className="relative"
                      style={{
                        height: `${(HOUR_END - HOUR_START + 1) * 60 * PX_PER_MINUTE}px`,
                      }}
                    >
                      {hours.flatMap((h) =>
                        [0, SLOT_MINUTES].map((m) => (
                          <div
                            key={`${h}-${m}`}
                            className={cn(
                              "absolute left-0 right-0 border-t",
                              m === 0 ? "border-line" : "border-dashed border-line/60",
                            )}
                            style={{
                              top: `${((h - HOUR_START) * 60 + m) * PX_PER_MINUTE}px`,
                            }}
                          />
                        )),
                      )}

                      {nowMinutes >= 0 &&
                        nowMinutes >= HOUR_START * 60 &&
                        nowMinutes <= HOUR_END * 60 && (
                          <div
                            className="absolute left-0 right-0 z-[5] h-px bg-danger"
                            style={{
                              top: `${(nowMinutes - HOUR_START * 60) * PX_PER_MINUTE}px`,
                            }}
                          >
                            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger" />
                          </div>
                        )}

                      {blocks.map((b) => {
                        const startMin = localMinutesIn(b.startsAt, finalAgenda.timezone);
                        const endMin = localMinutesIn(b.endsAt, finalAgenda.timezone);
                        const visStart = Math.max(startMin, HOUR_START * 60);
                        const visEnd = Math.min(endMin, HOUR_END * 60 + 60);
                        if (visEnd <= visStart) return null;
                        const top = (visStart - HOUR_START * 60) * PX_PER_MINUTE;
                        const height = (visEnd - visStart) * PX_PER_MINUTE;
                        return (
                          <div
                            key={b.id}
                            className="absolute left-1 right-1 overflow-hidden rounded-md border border-line bg-[repeating-linear-gradient(45deg,hsl(var(--surface-3))_0,hsl(var(--surface-3))_6px,hsl(var(--surface-2))_6px,hsl(var(--surface-2))_12px)] p-1.5 text-[10px] text-subtle"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="mono uppercase tracking-wider">Bloqueio</div>
                            {b.reason && <div className="truncate">{b.reason}</div>}
                          </div>
                        );
                      })}

                      {apts.map((a) => {
                        const startMin = localMinutesIn(a.startsAt, finalAgenda.timezone);
                        const endMin = localMinutesIn(a.endsAt, finalAgenda.timezone);
                        const visStart = Math.max(startMin, HOUR_START * 60);
                        const visEnd = Math.min(endMin, HOUR_END * 60 + 60);
                        if (visEnd <= visStart) return null;
                        const top = (visStart - HOUR_START * 60) * PX_PER_MINUTE;
                        const height = (visEnd - visStart) * PX_PER_MINUTE;
                        const requires = cancelRequiresReason(a.startsAt);

                        return (
                          <AppointmentDetailDialog
                            key={a.id}
                            appointment={{
                              id: a.id,
                              customerName: a.customerName,
                              customerPhone: a.customerPhone,
                              serviceName: a.serviceName,
                              serviceDurationMinutes: a.serviceDurationMinutes,
                              servicePriceCents: a.servicePriceCents,
                              professionalName: a.professionalName,
                              status: a.status,
                              startsAtLabel: formatHHMMIn(a.startsAt, finalAgenda.timezone),
                              endsAtLabel: formatHHMMIn(a.endsAt, finalAgenda.timezone),
                            }}
                            requiresCancelReason={requires}
                            trigger={
                              <button
                                type="button"
                                className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md bg-brand p-1.5 text-left text-[11px] text-brand-fg shadow-sm transition-transform hover:-translate-y-px hover:shadow-md"
                                style={{ top: `${top}px`, height: `${height}px` }}
                              >
                                <div className="truncate font-semibold leading-tight">
                                  {a.customerName}
                                </div>
                                <div className="mono truncate text-[10px] leading-tight opacity-90">
                                  {formatHHMMIn(a.startsAt, finalAgenda.timezone)} · {a.serviceName}
                                </div>
                              </button>
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
