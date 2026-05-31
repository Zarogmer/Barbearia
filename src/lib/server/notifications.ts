import "server-only";

import { toZonedTime } from "date-fns-tz";

import { prismaAdmin } from "@/lib/db";
import { getSmsProvider } from "@/lib/server/sms";

/**
 * Job diário de notificações.
 *
 * 1. Lembrete cliente (SMS, 24h antes): pra cada Appointment CONFIRMED
 *    com startsAt na janela [now+23h, now+25h] e reminderSentAt NULL,
 *    envia SMS e marca reminderSentAt.
 *
 * 2. Digest dono (email): pra cada org com appointments amanhã, manda
 *    1 email pro owner com agenda do dia seguinte.
 *
 * Usa prismaAdmin (cross-tenant) porque o cron roda fora de contexto
 * de usuário — não há sessão pra fixar current_org_id.
 *
 * Idempotente: rodar 2x no mesmo dia não duplica SMS (reminderSentAt
 * impede). Email pode duplicar se rodar 2x (sem flag por enquanto —
 * recomendação: cron 1x/dia às 9h).
 */

export type DailyJobResult = {
  remindersSent: number;
  remindersFailed: number;
  digestsSent: number;
  digestsFailed: number;
  startedAt: Date;
  finishedAt: Date;
};

export async function runDailyNotificationsJob(
  now: Date = new Date(),
): Promise<DailyJobResult> {
  const startedAt = new Date();
  const reminders = await sendBookingReminders(now);
  const digests = await sendOwnerDigests(now);
  return {
    ...reminders,
    ...digests,
    startedAt,
    finishedAt: new Date(),
  };
}

// ─── Lembretes 24h pro cliente ────────────────────────────

async function sendBookingReminders(
  now: Date,
): Promise<{ remindersSent: number; remindersFailed: number }> {
  // Janela de 24h ± 1h = [now + 23h, now + 25h]
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const pending = await prismaAdmin.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: { gte: windowStart, lt: windowEnd },
      customerPhone: { not: null },
    },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      startsAt: true,
      organization: {
        select: { name: true, slug: true, timezone: true, whatsapp: true },
      },
      service: { select: { name: true } },
      professional: { select: { name: true } },
    },
  });

  let sent = 0;
  let failed = 0;
  const sms = getSmsProvider();

  for (const a of pending) {
    if (!a.customerPhone) continue;
    const z = toZonedTime(a.startsAt, a.organization.timezone);
    const time = z.toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: a.organization.timezone,
    });
    const day = z.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: a.organization.timezone,
    });
    const body =
      `Oi ${a.customerName.split(" ")[0]}! Lembrete: amanhã (${day}) ` +
      `${time} você tem ${a.service.name} com ${a.professional.name} ` +
      `na ${a.organization.name}. Cancelar até 2h antes.`;

    try {
      await sms.send(a.customerPhone, body);
      await prismaAdmin.appointment.update({
        where: { id: a.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    } catch (e) {
      console.error(`[reminder] falha appt=${a.id}:`, e);
      failed += 1;
    }
  }

  return { remindersSent: sent, remindersFailed: failed };
}

// ─── Digest diário pro dono ───────────────────────────────

async function sendOwnerDigests(
  now: Date,
): Promise<{ digestsSent: number; digestsFailed: number }> {
  // "Amanhã" no servidor: now + 24h. Pega appointments cuja data local
  // (no fuso da org) seja igual à data de amanhã no fuso UTC.
  const tomorrowStart = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const tomorrowEnd = new Date(now.getTime() + 42 * 60 * 60 * 1000);

  const appts = await prismaAdmin.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { gte: tomorrowStart, lt: tomorrowEnd },
    },
    select: {
      id: true,
      customerName: true,
      startsAt: true,
      organizationId: true,
      organization: {
        select: {
          name: true,
          timezone: true,
          memberships: {
            where: { role: "OWNER" },
            select: { user: { select: { email: true, name: true } } },
            take: 1,
          },
        },
      },
      service: { select: { name: true, durationMinutes: true } },
      professional: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Agrupa por org
  const byOrg = new Map<string, typeof appts>();
  for (const a of appts) {
    const list = byOrg.get(a.organizationId) ?? [];
    list.push(a);
    byOrg.set(a.organizationId, list);
  }

  let sent = 0;
  let failed = 0;

  for (const [, orgAppts] of byOrg) {
    const first = orgAppts[0];
    if (!first) continue;
    const owner = first.organization.memberships[0]?.user;
    if (!owner?.email) continue;

    try {
      await sendDailyDigestEmail({
        toEmail: owner.email,
        ownerName: owner.name,
        orgName: first.organization.name,
        timezone: first.organization.timezone,
        appointments: orgAppts.map((a) => ({
          startsAt: a.startsAt,
          customerName: a.customerName,
          serviceName: a.service.name,
          professionalName: a.professional.name,
          durationMinutes: a.service.durationMinutes,
        })),
      });
      sent += 1;
    } catch (e) {
      console.error(`[digest] falha org=${first.organizationId}:`, e);
      failed += 1;
    }
  }

  return { digestsSent: sent, digestsFailed: failed };
}

type DailyDigestPayload = {
  toEmail: string;
  ownerName: string;
  orgName: string;
  timezone: string;
  appointments: Array<{
    startsAt: Date;
    customerName: string;
    serviceName: string;
    professionalName: string;
    durationMinutes: number;
  }>;
};

async function sendDailyDigestEmail(payload: DailyDigestPayload): Promise<void> {
  const lines = payload.appointments.map((a) => {
    const z = toZonedTime(a.startsAt, payload.timezone);
    const time = z.toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: payload.timezone,
    });
    return `${time} · ${a.customerName} · ${a.serviceName} (${a.durationMinutes}min) · ${a.professionalName}`;
  });

  const subject = `Agenda de amanhã (${payload.appointments.length} agendamento${payload.appointments.length !== 1 ? "s" : ""}) — ${payload.orgName}`;
  const body =
    `Oi ${payload.ownerName.split(" ")[0]},\n\n` +
    `Sua agenda de amanhã na ${payload.orgName}:\n\n` +
    lines.join("\n") +
    `\n\n— Lustro`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[mock-email] daily-digest → ${payload.toEmail}\n  ${subject}\n${body}`,
    );
    return;
  }

  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.toEmail,
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  }
}
