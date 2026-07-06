import { NextResponse } from "next/server";

import { prismaAdmin } from "@/lib/db";

/**
 * PBI-65: gera arquivo .ics (RFC 5545) pro cliente adicionar o agendamento
 * no calendário (Google Calendar, Apple Calendar, Outlook — todos suportam
 * o formato). Usado pelo botão "Adicionar ao Calendar" na tela de
 * confirmação /[orgSlug]/agendamento/[id].
 *
 * Segurança: exige UUID válido. O ID em si é o "token" — quem tem o link
 * do agendamento tem legitimidade pra baixar o .ics. Mesmo modelo da
 * própria página de detalhes (sem sessão).
 *
 * Usa prismaAdmin (bypass RLS) porque não temos orgSlug no path — a rota
 * é global. O UUID + validação por status impede vazar dados de outra org
 * na prática (não expõe nada além do que já aparece na página pública).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeIcs(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const appt = await prismaAdmin.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      customerName: true,
      service: { select: { name: true } },
      professional: { select: { name: true } },
      organization: { select: { name: true, address: true } },
    },
  });

  if (!appt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (appt.status === "CANCELLED") {
    return NextResponse.json({ error: "appointment cancelled" }, { status: 410 });
  }

  const summary = escapeIcs(`${appt.service.name} — ${appt.organization.name}`);
  const description = escapeIcs(
    `Agendamento com ${appt.professional.name} para ${appt.customerName}.`,
  );
  const location = escapeIcs(appt.organization.address ?? appt.organization.name);

  const nowStamp = formatIcsDate(new Date());
  const startStamp = formatIcsDate(appt.startsAt);
  const endStamp = formatIcsDate(appt.endsAt);
  const uid = `${appt.id}@lustro`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lustro//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${startStamp}`,
    `DTEND:${endStamp}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento-${appt.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
