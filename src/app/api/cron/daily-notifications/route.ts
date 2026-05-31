import { NextResponse } from "next/server";

import { runDailyNotificationsJob } from "@/lib/server/notifications";

/**
 * Endpoint disparado por cron externo 1x/dia (sugestão: 09:00 BRT).
 *
 * Setup Railway:
 *   1. Service settings → Scheduled tasks (ou um cron worker separado)
 *   2. Command: curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *      https://barbearia-dev.up.railway.app/api/cron/daily-notifications
 *
 * Alternativa: cron-job.org (free) com mesma URL + header.
 *
 * Segurança:
 *   - Bearer obrigatório. Sem CRON_SECRET ou wrong token → 401.
 *   - GET é bloqueado (só POST aceita) pra não disparar via clique.
 *
 * Idempotência: SMS marca reminderSentAt no DB. Rodar 2x no mesmo dia
 * não duplica lembretes. Email digest pode duplicar — rode 1x/dia.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runDailyNotificationsJob();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[cron daily-notifications] crash:", e);
    return NextResponse.json(
      { ok: false, error: "Job crashed (ver logs)." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST com Authorization: Bearer $CRON_SECRET." },
    { status: 405 },
  );
}
