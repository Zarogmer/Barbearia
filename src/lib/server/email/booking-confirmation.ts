import "server-only";

import { toZonedTime } from "date-fns-tz";

export type BookingConfirmationPayload = {
  customerEmail: string;
  customerName: string;
  orgName: string;
  orgSlug: string;
  serviceName: string;
  professionalName: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  timezone: string;
  appointmentId: string;
};

/**
 * Envia email de confirmação de agendamento.
 *
 * MVP sem Resend integrado — apenas loga no console em dev. Integração
 * real (Resend + template) vem com PBI-03 quando RESEND_API_KEY for
 * configurado. Fire-and-forget — se falhar, registra erro e segue.
 */
export async function sendBookingConfirmation(
  payload: BookingConfirmationPayload,
): Promise<void> {
  const z = toZonedTime(payload.startsAtUtc, payload.timezone);
  const friendly = z.toLocaleString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: payload.timezone,
  });

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[mock-email] booking-confirmation → ${payload.customerEmail}\n` +
        `  ${payload.orgName} · ${payload.serviceName} com ${payload.professionalName}\n` +
        `  ${friendly}\n` +
        `  link: /${payload.orgSlug}/agendamento/${payload.appointmentId}`,
    );
    return;
  }

  // TODO PBI-03: integrar Resend de verdade. Por ora, mesmo com key setada,
  // só logamos — sem template pronto pra produção.
  console.warn(
    `[email-pending-pbi-03] confirmação pra ${payload.customerEmail} ainda não enviada (Resend não plugado).`,
  );
}
