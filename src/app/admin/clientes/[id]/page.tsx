import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Gift,
  MessageSquare,
  Phone,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { BirthDateEditor } from "@/components/features/admin/BirthDateEditor";
import { CustomerPackagesSection } from "@/components/features/admin/CustomerPackagesSection";
import { CustomerPhotosSection } from "@/components/features/admin/CustomerPhotosSection";
import { DeleteNoteButton } from "@/components/features/admin/DeleteNoteButton";
import { NewNoteDialog } from "@/components/features/admin/NewNoteDialog";
import { SendMessageDialog } from "@/components/features/admin/SendMessageDialog";
import { auth } from "@/lib/auth";
import {
  getCustomerDetail,
  listCustomerAppointments,
} from "@/lib/server/customers";
import { listCustomerNotes } from "@/lib/server/customerNotes";
import { getLoyaltyStatusForCustomer } from "@/lib/server/loyalty";
import { listCustomerPhotos } from "@/lib/server/customer-photos";
import { listMessageTemplates } from "@/lib/server/messages";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import {
  listCustomerPackages,
  listPackages,
} from "@/lib/server/packages";
import { withTenant } from "@/lib/db";
import { cn, formatBRL } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  NO_SHOW: "No-show",
} as const;

function formatHHMM(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/login?next=/admin/clientes/${id}`);

  const membership = session.user.memberships[0];
  if (!membership) {
    return (
      <div className="mx-auto max-w-4xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você não pertence a nenhuma organização.
        </p>
      </div>
    );
  }
  const orgId = membership.organizationId;

  const [
    detail,
    appointments,
    notes,
    templates,
    org,
    customerPackages,
    availablePackages,
    photos,
    timezone,
  ] = await Promise.all([
    getCustomerDetail(orgId, id),
    listCustomerAppointments(orgId, id),
    listCustomerNotes(orgId, id),
    listMessageTemplates(orgId, { onlyActive: true }),
    getOrganizationForAdmin(orgId),
    listCustomerPackages(orgId, id),
    listPackages(orgId, { onlyActive: true }),
    listCustomerPhotos(orgId, id),
    withTenant(orgId, (db) =>
      db.organization
        .findUniqueOrThrow({ where: { id: orgId }, select: { timezone: true } })
        .then((o) => o.timezone),
    ),
  ]);
  // Separado pra não quebrar a inferência de tuple do Promise.all acima
  // (5 elementos confunde o inferidor com tipos de retorno mistos).
  const loyalty = await getLoyaltyStatusForCustomer(orgId, id);

  if (!detail) notFound();

  const initials = detail.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const lastVisitLabel = detail.stats.lastVisitAt
    ? detail.stats.lastVisitAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8">
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para clientes
      </Link>

      {/* Header */}
      <header className="flex flex-col items-start justify-between gap-4 rounded-md border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="avatar-ring">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-base font-bold">
              {initials}
            </span>
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">
              {detail.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mono text-[11px] text-subtle">
              <span>{detail.email}</span>
              {detail.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {detail.phone}
                </span>
              )}
            </div>
            <div className="mt-2">
              <BirthDateEditor userId={detail.userId} initial={detail.birthDate} />
            </div>
          </div>
        </div>
        <SendMessageDialog
          templates={templates.map((t) => ({
            id: t.id,
            title: t.title,
            body: t.body,
            key: t.key,
          }))}
          customer={{ name: detail.name, phone: detail.phone }}
          vars={{
            barbearia: org.name,
            endereco: org.address ?? undefined,
          }}
          triggerLabel="Enviar WhatsApp"
          triggerVariant="primary"
        />
      </header>

      {/* Stats KPI */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total atendimentos"
          value={String(detail.stats.totalAppointments)}
          icon={<Calendar className="h-4 w-4" />}
        />
        <Kpi
          label="Receita realizada"
          value={formatBRL(detail.stats.totalSpentCents)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="ok"
        />
        <Kpi
          label="No-shows"
          value={String(detail.stats.noShowCount)}
          icon={<X className="h-4 w-4" />}
          tone={detail.stats.noShowCount > 0 ? "warn" : "default"}
        />
        <Kpi
          label="Concluídos"
          value={String(detail.stats.completedCount)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="brand"
        />
      </section>

      <CustomerPackagesSection
        customerUserId={detail.userId}
        customerName={detail.name}
        active={customerPackages}
        availablePackages={availablePackages.map((p) => ({
          id: p.id,
          name: p.name,
          serviceName: p.serviceName,
          sessionsCount: p.sessionsCount,
          priceLabel: formatBRL(p.priceCents),
        }))}
      />

      <CustomerPhotosSection
        customerUserId={detail.userId}
        customerName={detail.name}
        photos={photos}
      />

      <div className="grid gap-3 sm:grid-cols-3 rounded-md border border-line bg-surface p-4 mono text-[11px]">
        <Meta
          label="Primeira visita"
          value={
            detail.stats.firstSeenAt
              ? detail.stats.firstSeenAt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "—"
          }
        />
        <Meta label="Última visita" value={lastVisitLabel} />
        <Meta
          label="Próximos agendamentos"
          value={String(detail.stats.upcomingCount)}
          highlight={detail.stats.upcomingCount > 0}
        />
      </div>

      {/* Cartão fidelidade (PBI-27) — só renderiza quando enabled */}
      {loyalty?.enabled && (
        <section
          className={cn(
            "overflow-hidden rounded-md border bg-gradient-to-br",
            loyalty.eligible
              ? "border-brand from-brand-soft/60 via-surface to-surface"
              : "border-line from-brand-soft/20 via-surface to-surface",
          )}
        >
          <div className="flex items-center gap-3 border-b border-line bg-surface/40 px-4 py-3">
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md",
                loyalty.eligible
                  ? "bg-brand text-brand-fg"
                  : "bg-brand-soft text-brand",
              )}
            >
              {loyalty.eligible ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
            </span>
            <div className="flex-1">
              <div className="font-display text-sm font-bold">
                {loyalty.eligible
                  ? "🎉 Cliente elegível pra recompensa"
                  : "Cartão fidelidade"}
              </div>
              <div className="mono text-[10px] text-subtle">
                Recompensa:{" "}
                <span className="font-semibold text-ink">
                  {loyalty.rewardLabel}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="num font-display text-2xl font-extrabold">
                {loyalty.count}
                <span className="mono ml-0.5 text-sm font-normal text-subtle">
                  /{loyalty.goal}
                </span>
              </div>
              {!loyalty.eligible && loyalty.remaining > 0 && (
                <div className="mono text-[10px] text-subtle">
                  faltam {loyalty.remaining}
                </div>
              )}
            </div>
          </div>
          {/* Stamps visual (até 20 max pra não estourar layout) */}
          <div className="flex flex-wrap gap-1.5 p-3">
            {Array.from({ length: Math.min(loyalty.goal, 20) }, (_, i) => {
              const stamped = i < Math.min(loyalty.count, 20);
              return (
                <span
                  key={i}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                    stamped
                      ? "bg-brand text-brand-fg shadow-sm"
                      : "border border-dashed border-line bg-surface text-subtle",
                  )}
                  aria-label={
                    stamped ? `Carimbo ${i + 1}` : `Vazio ${i + 1}`
                  }
                >
                  {stamped ? "★" : i + 1}
                </span>
              );
            })}
            {loyalty.goal > 20 && (
              <span className="mono text-[10px] text-subtle">
                (mostrando 20/{loyalty.goal})
              </span>
            )}
          </div>
        </section>
      )}

      {/* Notes */}
      <section className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-1.5 font-display text-sm font-bold">
              <MessageSquare className="h-4 w-4 text-brand" />
              Anotações da equipe
            </h2>
            <p className="mono text-[10px] uppercase tracking-wider text-subtle">
              Visível só pra equipe — não vai pro cliente
            </p>
          </div>
          <NewNoteDialog customerUserId={detail.userId} customerName={detail.name} />
        </div>

        {notes.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-surface-2 p-4 text-center mono text-[11px] text-subtle">
            Sem anotações. Adicione observações que ajudem a personalizar o
            atendimento.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-md border border-line bg-surface-2 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="mono text-[10px] uppercase tracking-wider text-subtle">
                    {n.createdByName ?? "?"} ·{" "}
                    {n.createdAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <DeleteNoteButton noteId={n.id} customerUserId={detail.userId} />
                </div>
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Atendimentos */}
      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-sm font-bold">
          Histórico de atendimentos
        </h2>

        {appointments.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-surface-2 p-4 text-center mono text-[11px] text-subtle">
            Sem atendimentos registrados.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-line">
            <div className="hidden border-b border-line bg-surface-2 px-4 py-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[140px_1fr_1fr_120px_100px] md:items-center md:gap-3">
              <div>Data</div>
              <div>Serviço</div>
              <div>Profissional</div>
              <div>Valor</div>
              <div className="text-right">Status</div>
            </div>
            <div className="divide-y divide-line">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[140px_1fr_1fr_120px_100px]"
                >
                  <div className="mono text-xs">
                    {a.startsAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                    <span className="hidden text-subtle md:inline">
                      {" · "}
                      {formatHHMM(a.startsAt, timezone)}
                    </span>
                  </div>
                  <div className="hidden text-sm font-medium md:block">
                    {a.serviceName}
                  </div>
                  <div className="hidden text-sm md:flex md:items-center md:gap-2">
                    <span className="mono inline-flex items-center gap-1 text-xs text-subtle">
                      <Clock className="h-3 w-3" />
                      {a.professionalName}
                    </span>
                  </div>
                  <div className="hidden mono text-xs md:block">
                    {formatBRL(a.servicePriceCents)}
                  </div>
                  <span
                    className={cn(
                      "justify-self-end rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      STATUS_TONE[a.status],
                    )}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "brand" | "ok" | "warn";
}) {
  const toneCls =
    tone === "brand"
      ? "text-brand"
      : tone === "ok"
        ? "text-ok"
        : tone === "warn"
          ? "text-warn"
          : "text-ink";
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="mb-1 inline-flex items-center gap-1.5 mono text-[10px] uppercase tracking-wider text-subtle">
        {icon}
        {label}
      </div>
      <div className={cn("num font-display text-2xl font-extrabold", toneCls)}>
        {value}
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="uppercase tracking-wider text-subtle">{label}</div>
      <div className={cn("text-sm", highlight ? "font-bold text-brand" : "font-medium")}>
        {value}
      </div>
    </div>
  );
}
