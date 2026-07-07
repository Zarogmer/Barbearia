import { NextResponse } from "next/server";

import { parseWebhookEvent } from "@zarogmer/whatsapp";

import { prismaAdmin } from "@/lib/db";
import { getWhatsAppProvider } from "@/lib/server/whatsapp";
import { buildBot, type BotExtra } from "@/lib/server/whatsapp-bot";

// Prisma precisa do runtime Node (não edge). Webhook nunca é cacheado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de entrada da Evolution API (evento MESSAGES_UPSERT, entre outros).
 * Registrado por instância em evolution-admin.ts (createInstanceForOrg).
 *
 * Fluxo: recebe mensagem do cliente → resolve a org pela instância → o bot
 * decide a resposta (regras + cooldown em banco) → envia via Evolution.
 * Mensagens próprias e de grupo são ignoradas (o BotRouter também filtra).
 *
 * Segurança: se WHATSAPP_WEBHOOK_TOKEN estiver setado, exige ?token=... na
 * URL do webhook. Instância desconhecida é ignorada silenciosamente (200).
 * Sempre responde 200 rápido — a Evolution reentrega em erro, e o cooldown
 * garante idempotência das auto-respostas.
 */
export async function POST(req: Request) {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (expectedToken) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== expectedToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = parseWebhookEvent(body);
  // connection/qrcode/unknown: barbearia lê status por polling — nada a fazer.
  if (event.kind !== "messages") {
    return NextResponse.json({ ok: true });
  }

  const org = await prismaAdmin.organization.findUnique({
    where: { evolutionInstance: event.instance },
    select: { id: true, slug: true, name: true },
  });
  if (!org) return NextResponse.json({ ok: true });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const bot = buildBot();
  const provider = getWhatsAppProvider();

  for (const msg of event.messages) {
    if (msg.fromMe || msg.isGroup) continue;

    const ctx = {
      message: msg,
      tenantId: org.id,
      extra: { orgSlug: org.slug, orgName: org.name, appUrl } satisfies BotExtra,
    };

    let reply: Awaited<ReturnType<typeof bot.handle>> = null;
    try {
      reply = await bot.handle(ctx);
    } catch (e) {
      console.error("[whatsapp webhook] bot falhou:", e);
      continue;
    }
    if (!reply) continue;

    try {
      await provider.send(msg.numero, reply.text, event.instance);
    } catch (e) {
      console.error(`[whatsapp webhook] envio falhou numero=${msg.numero}:`, e);
      // Libera o cooldown pra próxima mensagem do cliente tentar de novo.
      await bot.releaseCooldown(ctx, reply.ruleId).catch(() => undefined);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(
    { error: "Webhook Evolution: use POST." },
    { status: 405 },
  );
}
