import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { prismaAdmin } from "@/lib/db";
import { handleInboundBotMessage } from "@/lib/server/bot-conversation";
import { getWhatsAppProvider } from "@/lib/server/whatsapp";
import { evolutionInboundSchema, extractMessageText } from "@/lib/validators/whatsapp-inbound";

/**
 * Webhook inbound da Evolution API (PBI-60). Recebe mensagens que os
 * clientes mandam no WhatsApp da barbearia e roteia pro bot.
 *
 * Segurança: a Evolution não assina webhook — o contrato é um secret na
 * query string (?token=), configurado junto do webhook na instância.
 * O orgId deriva do NOME DA INSTÂNCIA (Organization.evolutionInstance),
 * nunca de campo do payload controlável pelo remetente.
 *
 * Sempre responde 200 pra eventos ignorados — 4xx/5xx faz a Evolution
 * reentregar e viraria processamento duplicado.
 */

/** Compara em tempo constante via hash (evita vazar tamanho). */
function safeTokenEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Webhook não configurado." }, { status: 503 });
  }
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!safeTokenEqual(token, secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "json" });
  }

  const parsed = evolutionInboundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true, ignored: "payload" });
  }
  const payload = parsed.data;

  // Só mensagens novas de contato individual, escritas pelo cliente.
  const event = payload.event.toLowerCase().replace(/_/g, ".");
  if (event !== "messages.upsert") {
    return NextResponse.json({ ok: true, ignored: "event" });
  }
  const { remoteJid, fromMe } = payload.data.key;
  if (fromMe || !remoteJid.endsWith("@s.whatsapp.net")) {
    return NextResponse.json({ ok: true, ignored: "jid" });
  }
  const text = extractMessageText(payload);
  if (!text) {
    return NextResponse.json({ ok: true, ignored: "sem-texto" });
  }

  // Resolução instância → org antes do tenant context existir (mesmo
  // caso do orgSlug no middleware) — uso legítimo do prismaAdmin.
  const org = await prismaAdmin.organization.findUnique({
    where: { evolutionInstance: payload.instance },
    select: { id: true, name: true, slug: true, timezone: true },
  });
  if (!org) {
    return NextResponse.json({ ok: true, ignored: "instancia" });
  }

  const phone = (remoteJid.split("@")[0] ?? "").replace(/\D/g, "");
  const reply = await handleInboundBotMessage({ org, phone, text });

  if (reply) {
    try {
      await getWhatsAppProvider().send(phone, reply, payload.instance);
    } catch (e) {
      // Envio falhou (Evolution instável): não reentregar o webhook —
      // o estado da conversa já avançou; o cliente pode reenviar.
      console.error("bot inbound: falha ao responder", e);
    }
  }

  return NextResponse.json({ ok: true, replied: Boolean(reply) });
}
