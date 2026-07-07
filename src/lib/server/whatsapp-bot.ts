import "server-only";

import type { BotRouter, CooldownStore } from "@zarogmer/whatsapp";

import { prismaAdmin } from "@/lib/db";

import { createBot, type BotExtra } from "./whatsapp-bot-rules";

/**
 * Store de cooldown do bot persistido no Postgres (tabela
 * whatsapp_autoreply_cooldown). Claim ATÔMICO — evita que webhooks
 * duplicados do Evolution disparem duas auto-respostas: UPDATE condicional
 * (sentAt fora da janela) e, se não pegou, INSERT ON CONFLICT DO NOTHING.
 *
 * A key vem do BotRouter como `${organizationId}:${phone}:${ruleId}` — como
 * os ids de regra não têm ':', o split é seguro.
 */
export class PrismaCooldownStore implements CooldownStore {
  async claim(key: string, minutos: number): Promise<boolean> {
    if (minutos <= 0) return true;
    const { organizationId, phone, ruleId } = parseKey(key);
    const cutoff = new Date(Date.now() - minutos * 60_000);

    const updated = await prismaAdmin.$executeRaw`
      UPDATE "whatsapp_autoreply_cooldown"
      SET "sentAt" = NOW()
      WHERE "organizationId" = ${organizationId}::uuid
        AND "phone" = ${phone}
        AND "ruleId" = ${ruleId}
        AND "sentAt" < ${cutoff}
    `;
    if (updated > 0) return true;

    const inserted = await prismaAdmin.$executeRaw`
      INSERT INTO "whatsapp_autoreply_cooldown" ("organizationId", "phone", "ruleId", "sentAt")
      VALUES (${organizationId}::uuid, ${phone}, ${ruleId}, NOW())
      ON CONFLICT ("organizationId", "phone", "ruleId") DO NOTHING
    `;
    return inserted > 0;
  }

  async release(key: string): Promise<void> {
    const { organizationId, phone, ruleId } = parseKey(key);
    await prismaAdmin.$executeRaw`
      DELETE FROM "whatsapp_autoreply_cooldown"
      WHERE "organizationId" = ${organizationId}::uuid
        AND "phone" = ${phone}
        AND "ruleId" = ${ruleId}
    `;
  }
}

function parseKey(key: string): { organizationId: string; phone: string; ruleId: string } {
  const [organizationId = "", phone = "", ...rest] = key.split(":");
  return { organizationId, phone, ruleId: rest.join(":") };
}

/** Bot pronto pra uso no webhook, com cooldown persistido em banco. */
export function buildBot(): BotRouter<BotExtra> {
  return createBot(new PrismaCooldownStore());
}

export type { BotExtra };
