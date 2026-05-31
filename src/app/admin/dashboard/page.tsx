import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Cake,
  Calendar,
  MessageCircle,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { OnboardingChecklist } from "@/components/features/admin/OnboardingChecklist";
import { auth } from "@/lib/auth";
import {
  buildBirthdayMessage,
  buildWhatsAppLink,
  listUpcomingBirthdays,
} from "@/lib/server/birthdays";
import { getDashboardStats } from "@/lib/server/dashboard";
import { getOnboardingState } from "@/lib/server/onboarding";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import { cn, formatBRL, formatDuration } from "@/lib/utils";

function formatTimeIn(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/dashboard");

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

  const [stats, onboarding, org, birthdays] = await Promise.all([
    getDashboardStats(membership.organizationId),
    getOnboardingState(membership.organizationId),
    getOrganizationForAdmin(membership.organizationId),
    listUpcomingBirthdays(membership.organizationId, 31),
  ]);
  const showOnboarding = !onboarding.allDone && !onboarding.dismissed;
  const birthdaysToday = birthdays.filter((b) => b.daysUntil === 0);
  const birthdaysMonth = birthdays.filter(
    (b) => b.daysUntil > 0 && b.daysUntil <= 31,
  );

  const todayLocal = toZonedTime(new Date(), stats.timezone);
  const todayLabel = todayLocal.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: stats.timezone,
  });

  const occupancyTone: KpiTone =
    stats.occupancyPercent >= 80
      ? "warn"
      : stats.occupancyPercent >= 50
        ? "ok"
        : "brand";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Painel · hoje</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight capitalize md:text-3xl">
          {todayLabel}
        </h1>
        <p className="text-sm text-subtle">Visão geral do dia.</p>
      </header>

      {showOnboarding && (
        <OnboardingChecklist
          steps={onboarding.steps}
          completed={onboarding.completed}
          total={onboarding.total}
        />
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Agendamentos hoje"
          value={String(stats.todayCount)}
          bar={{
            pct: stats.todayCount > 0 ? Math.min(100, stats.todayCount * 10) : 0,
            tone: "brand",
          }}
          footnote={`${stats.todayCount} confirmado${stats.todayCount !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Faturamento estimado"
          value={formatBRL(stats.estimatedRevenueCents)}
          bar={{
            pct: stats.estimatedRevenueCents > 0
              ? Math.min(100, Math.round((stats.estimatedRevenueCents / 120_000) * 100))
              : 0,
            tone: "ok",
          }}
          footnote={
            stats.estimatedRevenueCents === 0
              ? "sem agendamentos hoje"
              : "se todos comparecerem"
          }
        />
        <KpiCard
          label="Ocupação"
          value={`${stats.occupancyPercent}%`}
          bar={{ pct: stats.occupancyPercent, tone: occupancyTone }}
          footnote="das horas de trabalho do dia"
        />
        <KpiCard
          label="No-shows (7d)"
          value={String(stats.noShowCount7d)}
          bar={{
            pct: stats.noShowCount7d > 0 ? Math.min(100, stats.noShowCount7d * 20) : 0,
            tone: stats.noShowCount7d > 3 ? "danger" : "warn",
          }}
          footnote={stats.noShowCount7d === 0 ? "limpo essa semana" : "últimos 7 dias"}
        />
      </div>

      {/* Widget aniversariantes (se houver) */}
      {(birthdaysToday.length > 0 || birthdaysMonth.length > 0) && (
        <section className="overflow-hidden rounded-md border border-brand/30 bg-gradient-to-br from-brand-soft/40 via-surface to-surface">
          <div className="flex items-center justify-between border-b border-line bg-surface/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-fg">
                <Cake className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-display text-sm font-bold">
                {birthdaysToday.length > 0
                  ? `🎉 Aniversariante${birthdaysToday.length !== 1 ? "s" : ""} hoje`
                  : "Aniversariantes do mês"}
              </h2>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 mono text-[10px] font-semibold text-brand">
                {birthdaysToday.length + birthdaysMonth.length}
              </span>
            </div>
            <Link
              href="/admin/aniversariantes"
              className="text-xs text-subtle transition-colors hover:text-ink"
            >
              Ver todos →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {[...birthdaysToday, ...birthdaysMonth.slice(0, 5)].map((b) => {
              const initials = b.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const waLink = b.phone
                ? buildWhatsAppLink(b.phone, buildBirthdayMessage(org.name, b.name))
                : null;
              return (
                <li
                  key={b.userId}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5"
                >
                  <span className="avatar-ring">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-xs font-bold">
                      {initials}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/clientes/${b.userId}`}
                      className="block truncate text-sm font-semibold hover:text-brand"
                    >
                      {b.name}
                    </Link>
                    <div className="mono text-[10px] text-subtle">
                      {b.daysUntil === 0
                        ? "🎂 hoje"
                        : b.daysUntil === 1
                          ? "amanhã"
                          : `em ${b.daysUntil} dias`}
                    </div>
                  </div>
                  {waLink && (
                    <Link
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tap inline-flex h-8 items-center gap-1 rounded-md bg-ok/10 px-2.5 text-[11px] font-semibold text-ok hover:bg-ok/20"
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Atalhos rápidos */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <ShortcutCard
          href="/admin/agenda"
          icon={<Calendar className="h-4 w-4" />}
          label="Agenda"
          hint="Ver dia / semana / mês"
          tone="brand"
        />
        <ShortcutCard
          href="/admin/comandas"
          icon={<Receipt className="h-4 w-4" />}
          label="Comandas"
          hint="Abrir / fechar contas"
          tone="ok"
        />
        <ShortcutCard
          href="/admin/clientes"
          icon={<Users className="h-4 w-4" />}
          label="Clientes"
          hint="CRM + importar CSV"
          tone="subtle"
        />
        <ShortcutCard
          href="/admin/relatorios"
          icon={<TrendingUp className="h-4 w-4" />}
          label="Relatórios"
          hint="Faturamento + ticket"
          tone="warn"
        />
      </section>

      {/* Próximos agendamentos — agrupados por profissional pro dono ver
          rapidamente quem tem o quê pela frente sem precisar abrir agenda. */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-sm font-bold">
              Próximos do dia · por profissional
            </h2>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 mono text-[10px] font-semibold text-brand">
              {stats.upcomingAppointments.length}
            </span>
          </div>
          <Link
            href="/admin/agenda"
            className="text-xs text-subtle transition-colors hover:text-ink"
          >
            Ver agenda completa →
          </Link>
        </div>
        {stats.upcomingByProfessional.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-display text-sm font-bold">Nenhum agendamento futuro hoje</p>
            <p className="mt-1 mono text-[10px] uppercase tracking-wider text-subtle">
              dia tranquilo · ou ja terminou
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {stats.upcomingByProfessional.map((group) => {
              const profInitials = group.professionalName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div key={group.professionalId} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="avatar-ring">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                          {profInitials}
                        </span>
                      </span>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">
                          {group.professionalName}
                        </div>
                        <div className="mono text-[10px] text-subtle">
                          {group.appointments.length} agendamento
                          {group.appointments.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 pl-10">
                    {group.appointments.slice(0, 5).map((a) => (
                      <li
                        key={a.id}
                        className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md bg-surface-2/60 px-3 py-2"
                      >
                        <span className="mono text-xs font-semibold">
                          {formatTimeIn(a.startsAt, stats.timezone)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {a.customerName}
                          </div>
                          <div className="mono truncate text-[10px] text-subtle">
                            {a.serviceName} ·{" "}
                            {formatDuration(a.serviceDurationMinutes)}
                          </div>
                        </div>
                        <span className="mono text-xs font-semibold text-subtle">
                          {formatBRL(a.servicePriceCents)}
                        </span>
                      </li>
                    ))}
                    {group.appointments.length > 5 && (
                      <li className="pt-1 text-center mono text-[10px] text-subtle">
                        + {group.appointments.length - 5} mais
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type KpiTone = "brand" | "ok" | "warn" | "danger";

function ShortcutCard({
  href,
  icon,
  label,
  hint,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: "brand" | "ok" | "warn" | "subtle";
}) {
  return (
    <Link
      href={href}
      className="tap group flex items-center gap-3 rounded-md border border-line bg-surface p-3 transition-all hover:-translate-y-px hover:border-brand hover:shadow-sm"
    >
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
          tone === "brand" && "bg-brand-soft text-brand",
          tone === "ok" && "bg-ok/15 text-ok",
          tone === "warn" && "bg-warn/15 text-warn",
          tone === "subtle" && "bg-surface-2 text-subtle",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-[11px] text-subtle">{hint}</div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-subtle transition-colors group-hover:text-brand" />
    </Link>
  );
}

function KpiCard({
  label,
  value,
  bar,
  footnote,
}: {
  label: string;
  value: string;
  bar: { pct: number; tone: KpiTone };
  footnote: string;
}) {
  const barClass =
    bar.tone === "ok"
      ? "bg-ok"
      : bar.tone === "warn"
        ? "bg-warn"
        : bar.tone === "danger"
          ? "bg-danger"
          : "bg-brand";

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="mono mb-1 text-[10px] uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="num font-display text-3xl font-extrabold">{value}</span>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={barClass} style={{ width: `${bar.pct}%` }} />
      </div>
      <div className="mono mt-1 text-[10px] text-subtle">{footnote}</div>
    </div>
  );
}
