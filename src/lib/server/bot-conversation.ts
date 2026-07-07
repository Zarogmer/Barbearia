import "server-only";

import { addDays, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { parseBotIntent } from "@/lib/bot-intents";
import { withTenant } from "@/lib/db";
import { BookingError, cancelAppointment } from "@/lib/server/booking-service";

import type { BotConversation } from "@prisma/client";

/**
 * Máquina de estados do bot WhatsApp (PBI-60 — parte 1: CANCELAR).
 *
 * Regras do card:
 * - Bot só age pra telefone com Appointment CONFIRMED nos próximos 7 dias.
 * - 2+ agendamentos futuros: lista numerada e pede o número.
 * - Cancelamento sempre pede confirmação "SIM CANCELAR".
 * - Texto que não é keyword E sem conversa ativa → silêncio (null), pra
 *   não atropelar conversa humana na aba Conversas.
 *
 * Reagendar (AGENDAR → 3 slots) fica na parte 2 da PBI.
 */

const CONVERSATION_TTL_MIN = 30;
const LOOKAHEAD_DAYS = 7;
const MAX_LISTED = 5;

export type BotOrgContext = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

type UpcomingAppt = {
  id: string;
  startsAt: Date;
  serviceName: string;
  professionalName: string;
};

function digitsOnly(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

function describeAppt(a: UpcomingAppt, timezone: string): string {
  const when = formatInTimeZone(a.startsAt, timezone, "EEE dd/MM 'às' HH:mm", {
    locale: ptBR,
  });
  return `${a.serviceName} ${when} com ${a.professionalName}`;
}

function bookingUrl(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lustro.app").replace(/\/$/, "");
  return `${base}/${slug}/agendar`;
}

/** Extrai appointmentIds do payload Json sem confiar no shape. */
function payloadAppointmentIds(payload: unknown): string[] {
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { appointmentIds?: unknown }).appointmentIds)
  ) {
    return (payload as { appointmentIds: unknown[] }).appointmentIds.filter(
      (x): x is string => typeof x === "string",
    );
  }
  return [];
}

function confirmCancelMessage(a: UpcomingAppt, timezone: string): string {
  return `Cancelar ${describeAppt(a, timezone)}?\nResponda SIM CANCELAR pra confirmar.`;
}

function helpMessage(orgName: string): string {
  return (
    `🤖 Comandos da ${orgName}:\n` +
    `CANCELAR — cancela um agendamento\n` +
    `AJUDA — mostra essa mensagem\n` +
    `Reagendamento pelo WhatsApp: em breve!`
  );
}

function nudgeMessage(convo: BotConversation): string {
  if (convo.step === "CANCEL_CONFIRM") {
    return "Não entendi. Responda SIM CANCELAR pra confirmar o cancelamento, ou AJUDA.";
  }
  if (convo.step === "PICK_APPOINTMENT") {
    return "Não entendi. Responda o número do agendamento (1, 2, ...) ou AJUDA.";
  }
  return "Não entendi. Responda AJUDA pra ver os comandos.";
}

export type HandleInboundArgs = {
  org: BotOrgContext;
  /** Telefone só dígitos, com DDI (ex: 5511912345678). */
  phone: string;
  text: string;
  now?: Date;
};

/**
 * Processa uma mensagem inbound e devolve a resposta do bot, ou null
 * quando o bot deve ficar em silêncio.
 */
export async function handleInboundBotMessage(args: HandleInboundArgs): Promise<string | null> {
  const { org, phone, text, now = new Date() } = args;
  if (!phone) return null;

  const intent = parseBotIntent(text);
  const expiresAt = addMinutes(now, CONVERSATION_TTL_MIN);

  const { convo, upcoming } = await withTenant(org.id, async (db) => {
    let convo = await db.botConversation.findUnique({
      where: { organizationId_phone: { organizationId: org.id, phone } },
    });
    if (convo && convo.expiresAt < now) {
      await db.botConversation.delete({ where: { id: convo.id } });
      convo = null;
    }
    // Formato de customerPhone varia ("+55 11 9...", "5511..."), então o
    // match é por dígitos em JS. Janela de 7d por org é pequena (take capa).
    const rows = await db.appointment.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: now, lte: addDays(now, LOOKAHEAD_DAYS) },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        customerPhone: true,
        service: { select: { name: true } },
        professional: { select: { name: true } },
      },
      take: 500,
    });
    const upcoming: UpcomingAppt[] = rows
      .filter((r) => digitsOnly(r.customerPhone) === phone)
      .map((r) => ({
        id: r.id,
        startsAt: r.startsAt,
        serviceName: r.service.name,
        professionalName: r.professional.name,
      }));
    return { convo, upcoming };
  });

  async function saveConversation(data: {
    step: "PICK_APPOINTMENT" | "CANCEL_CONFIRM";
    appointmentId: string | null;
    appointmentIds: string[];
  }): Promise<void> {
    await withTenant(org.id, async (db) => {
      await db.botConversation.upsert({
        where: { organizationId_phone: { organizationId: org.id, phone } },
        create: {
          organizationId: org.id,
          phone,
          step: data.step,
          appointmentId: data.appointmentId,
          payload: { appointmentIds: data.appointmentIds },
          expiresAt,
        },
        update: {
          step: data.step,
          appointmentId: data.appointmentId,
          payload: { appointmentIds: data.appointmentIds },
          expiresAt,
        },
      });
    });
  }

  async function deleteConversation(): Promise<void> {
    await withTenant(org.id, async (db) => {
      await db.botConversation.deleteMany({
        where: { organizationId: org.id, phone },
      });
    });
  }

  switch (intent.type) {
    case "CANCEL": {
      if (upcoming.length === 0) {
        return `Não achei agendamento futuro pra esse número na ${org.name}. Pra agendar: ${bookingUrl(org.slug)}`;
      }
      const [single] = upcoming;
      if (upcoming.length === 1 && single) {
        const appt = single;
        await saveConversation({
          step: "CANCEL_CONFIRM",
          appointmentId: appt.id,
          appointmentIds: [appt.id],
        });
        return confirmCancelMessage(appt, org.timezone);
      }
      const listed = upcoming.slice(0, MAX_LISTED);
      await saveConversation({
        step: "PICK_APPOINTMENT",
        appointmentId: null,
        appointmentIds: listed.map((a) => a.id),
      });
      const lines = listed.map((a, i) => `${i + 1}. ${describeAppt(a, org.timezone)}`);
      return `Você tem ${upcoming.length} agendamentos:\n${lines.join("\n")}\nQual quer cancelar? Responda o número.`;
    }

    case "PICK": {
      if (convo?.step !== "PICK_APPOINTMENT") {
        return convo ? nudgeMessage(convo) : null;
      }
      const ids = payloadAppointmentIds(convo.payload);
      const id = ids[intent.n - 1];
      if (!id) {
        return `Responda um número de 1 a ${ids.length}.`;
      }
      const appt = upcoming.find((a) => a.id === id);
      if (!appt) {
        await deleteConversation();
        return "Esse agendamento não está mais ativo. Responda CANCELAR pra recomeçar.";
      }
      await saveConversation({
        step: "CANCEL_CONFIRM",
        appointmentId: appt.id,
        appointmentIds: ids,
      });
      return confirmCancelMessage(appt, org.timezone);
    }

    case "CONFIRM_CANCEL": {
      if (convo?.step !== "CANCEL_CONFIRM" || !convo.appointmentId) {
        return "Não tem cancelamento pendente. Responda CANCELAR pra começar.";
      }
      const appt = upcoming.find((a) => a.id === convo.appointmentId);
      if (!appt) {
        await deleteConversation();
        return "Esse agendamento não está mais ativo. Responda CANCELAR pra recomeçar.";
      }
      try {
        // RN do card: cancelReason marca a origem; RN-07 (motivo obrigatório
        // < 2h antes) fica satisfeita pelo próprio motivo do bot.
        await cancelAppointment({
          organizationId: org.id,
          appointmentId: appt.id,
          reason: "Cancelado pelo cliente via WhatsApp bot",
          now,
        });
      } catch (e) {
        if (e instanceof BookingError) {
          await deleteConversation();
          return e.message;
        }
        throw e;
      }
      await deleteConversation();
      return `✅ Cancelado: ${describeAppt(appt, org.timezone)}. Valeu por avisar!\nPra remarcar: ${bookingUrl(org.slug)}`;
    }

    case "YES": {
      if (convo?.step === "CANCEL_CONFIRM") {
        return "Pra confirmar de vez, responda SIM CANCELAR.";
      }
      return convo ? nudgeMessage(convo) : null;
    }

    case "RESCHEDULE": {
      if (upcoming.length === 0 && !convo) return null;
      return `Reagendar pelo WhatsApp tá chegando! Por enquanto: responda CANCELAR pra liberar o horário e agende o novo em ${bookingUrl(org.slug)}`;
    }

    case "HELP":
      return helpMessage(org.name);

    case "UNKNOWN":
      return convo ? nudgeMessage(convo) : null;
  }
}
