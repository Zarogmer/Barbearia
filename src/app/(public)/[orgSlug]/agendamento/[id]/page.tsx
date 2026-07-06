import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, Calendar, Check, MapPin, Scissors, User } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { getAppointmentById } from "@/lib/server/appointments";
import { getLoyaltyStatusForCustomer } from "@/lib/server/loyalty";
import { getOrgPublicProfile } from "@/lib/server/orgs";
import { formatBRL, formatDuration } from "@/lib/utils";

import { BookingHubActions } from "./BookingHubActions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cancelamento < 2h antes ou apos o inicio exige motivo — regra RN-05
 *  herdada de src/lib/server/booking-service.ts. Duplico so pra sinalizar
 *  na UI (o server valida de novo — nao confio em prop pra bloquear). */
function cancelNeedsReason(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() - now.getTime() < 2 * 60 * 60 * 1000;
}

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const org = await getOrgPublicProfile(orgSlug);
  if (!org) notFound();

  const appt = await getAppointmentById(org.id, id);
  if (!appt) notFound();

  const now = new Date();
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
  const isPast = appt.startsAt.getTime() < now.getTime();

  // Loyalty so faz sentido se cliente logou/tem User no sistema E a org
  // tem fidelidade ligada. Sem userId, appointment eh guest e nao conta.
  const loyalty =
    appt.userId && !isCancelled ? await getLoyaltyStatusForCustomer(org.id, appt.userId) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 sm:max-w-2xl">
      {/* Hero */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div
          className={
            isCancelled
              ? "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-3 text-subtle"
              : "mb-4 flex h-16 w-16 animate-pop-check items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg shadow-[hsl(var(--brand)/0.4)]"
          }
        >
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
        <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight">
          {isCancelled ? "Agendamento cancelado" : "Confirmado!"}
        </h1>
        <p className="max-w-xs text-sm text-subtle">
          {isCancelled
            ? "Esse agendamento foi cancelado. Você pode marcar outro a qualquer momento."
            : isPast
              ? "Esse horário já passou. Esperamos que tenha sido ótimo!"
              : "Vamos te esperar. Guardamos os detalhes abaixo."}
        </p>
      </div>

      {/* Card do agendamento */}
      <div className="mb-5 rounded-md border border-line bg-gradient-to-br from-surface to-surface-2 p-5">
        <div className="mono mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">
          <span
            className={
              isCancelled ? "h-2 w-2 rounded-full bg-subtle" : "h-2 w-2 rounded-full bg-ok"
            }
          />
          {isCancelled ? "Cancelado" : "Confirmado"} · #{idShort}
        </div>

        <div className="mb-3 flex items-start gap-3">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-bold tracking-tight">
              {appt.service.name}
            </div>
            <div className="mono text-xs text-subtle">
              {formatDuration(appt.service.durationMinutes)} · {formatBRL(appt.service.priceCents)}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-start gap-3">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="mono text-xs capitalize text-subtle">
            {dateLabel} · {timeLabel}
          </div>
        </div>

        <div className="mb-3 flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="text-xs text-subtle">com {appt.professional.name}</div>
        </div>

        {org.address && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
            <div className="text-xs text-subtle">{org.address}</div>
          </div>
        )}
      </div>

      {/* Checklist do que vai rolar (so ativo/futuro) */}
      {!isCancelled && !isPast && (
        <div className="mb-5 rounded-md border border-line bg-surface p-4">
          <div className="mono mb-3 text-[10px] font-semibold uppercase tracking-wider text-subtle">
            O que vai rolar
          </div>
          <ul className="space-y-2 text-xs text-subtle">
            <ChecklistItem>
              Você vai receber lembrete 24h antes por email
              {appt.customerPhone ? " e WhatsApp" : ""}
            </ChecklistItem>
            <ChecklistItem>
              Clique em <strong>Adicionar ao calendário</strong> pra não esquecer
            </ChecklistItem>
            {org.address && (
              <ChecklistItem>
                <strong>Como chegar</strong> abre no Google Maps
              </ChecklistItem>
            )}
            <ChecklistItem>
              Se precisar cancelar ou remarcar, os botões estão aí embaixo
            </ChecklistItem>
          </ul>
        </div>
      )}

      {/* Botoes de acao (client component) */}
      <BookingHubActions
        orgSlug={orgSlug}
        orgName={org.name}
        orgAddress={org.address}
        appointmentId={appt.id}
        serviceId={appt.service.id}
        professionalId={appt.professional.id}
        serviceName={appt.service.name}
        professionalName={appt.professional.name}
        startsAt={appt.startsAt.toISOString()}
        friendlyDate={dateLabel}
        friendlyTime={timeLabel}
        reasonRequired={cancelNeedsReason(appt.startsAt, now)}
        isCancelled={isCancelled}
      />

      {/* Cartao fidelidade */}
      {loyalty?.enabled && (
        <LoyaltyCard
          count={loyalty.count}
          goal={loyalty.goal}
          rewardLabel={loyalty.rewardLabel}
          eligible={loyalty.eligible}
          progressPct={loyalty.progressPct}
          remaining={loyalty.remaining}
        />
      )}

      {/* Link de volta */}
      <div className="mt-8 text-center">
        <Link
          href={`/${orgSlug}`}
          className="text-xs font-medium text-subtle underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          ← voltar para {org.name}
        </Link>
      </div>

      <p className="mono mt-10 text-center text-[10px] text-subtle">
        powered by <span className="text-brand">Lustro</span>
      </p>
    </main>
  );
}

function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function LoyaltyCard({
  count,
  goal,
  rewardLabel,
  eligible,
  progressPct,
  remaining,
}: {
  count: number;
  goal: number;
  rewardLabel: string;
  eligible: boolean;
  progressPct: number;
  remaining: number;
}) {
  return (
    <div className="mt-5 rounded-md border border-brand/30 bg-brand-soft/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-fg">
            <Bell className="h-3 w-3" />
          </span>
          <div className="font-display text-sm font-bold text-brand">Cartão fidelidade</div>
        </div>
        <div className="mono text-[10px] font-semibold uppercase tracking-wider text-brand">
          {count} / {goal}
        </div>
      </div>

      {/* Progresso visual: N tesourinhas + resto vazio */}
      <div className="mb-2 flex flex-wrap gap-1">
        {Array.from({ length: goal }).map((_, i) => (
          <span
            key={i}
            className={
              i < count
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-fg"
                : "flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-brand/40 text-brand/40"
            }
          >
            <Scissors className="h-3 w-3" />
          </span>
        ))}
      </div>

      <div className="mb-2 h-1 rounded-full bg-brand/10">
        <div
          className="h-1 rounded-full bg-brand transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="text-xs text-subtle">
        {eligible ? (
          <>
            Você ganhou <strong className="text-brand">{rewardLabel}</strong>! Combine com a
            barbearia no próximo atendimento.
          </>
        ) : (
          <>
            Faltam <strong>{remaining}</strong> {remaining === 1 ? "atendimento" : "atendimentos"}{" "}
            pra ganhar <strong>{rewardLabel}</strong>.
          </>
        )}
      </p>
    </div>
  );
}
