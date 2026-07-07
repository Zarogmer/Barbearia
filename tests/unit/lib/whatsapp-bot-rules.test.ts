import { describe, expect, it } from "vitest";

import { InMemoryCooldownStore, type InboundMessage } from "@zarogmer/whatsapp";

import { createBot, type BotExtra } from "@/lib/server/whatsapp-bot-rules";

const EXTRA: BotExtra = {
  orgSlug: "barbearia-do-vini",
  orgName: "Barbearia do Vini",
  appUrl: "https://app.exemplo.com",
};

function msg(texto: string, overrides: Partial<InboundMessage> = {}): InboundMessage {
  return {
    messageId: "m1",
    remoteJid: "5513999999999@s.whatsapp.net",
    numero: "5513999999999",
    fromMe: false,
    isGroup: false,
    pushName: "Cliente",
    tipo: "conversation",
    texto,
    mediaType: null,
    mediaMimetype: null,
    timestampMs: 1_700_000_000_000,
    respostaStatus: false,
    quotedTexto: null,
    quotedTipo: null,
    raw: {},
    ...overrides,
  };
}

function ctx(texto: string, overrides: Partial<InboundMessage> = {}) {
  return { message: msg(texto, overrides), tenantId: "org-1", extra: EXTRA };
}

describe("bot da barbearia", () => {
  it('regra "agendar" responde com o link de agendamento', async () => {
    const bot = createBot(new InMemoryCooldownStore());
    const reply = await bot.handle(ctx("queria agendar um corte amanhã"));
    expect(reply?.ruleId).toBe("agendar");
    expect(reply?.text).toContain("https://app.exemplo.com/barbearia-do-vini/agendar");
  });

  it("keyword é tolerante a acento e caixa", async () => {
    const bot = createBot(new InMemoryCooldownStore());
    expect((await bot.handle(ctx("HORÁRIO pra amanhã?")))?.ruleId).toBe("agendar");
    expect((await bot.handle(ctx("quero remarcar")))?.ruleId).toBe("cancelar");
  });

  it("sem regra casada, cai no fallback com nome da org e cooldown", async () => {
    const store = new InMemoryCooldownStore();
    const bot = createBot(store);
    const first = await bot.handle(ctx("bom dia, tudo bem?"));
    expect(first?.ruleId).toBe("autoresposta");
    expect(first?.text).toContain("Barbearia do Vini");
    // Segunda mensagem do mesmo número dentro da janela: silêncio.
    expect(await bot.handle(ctx("oi de novo"))).toBeNull();
    // Número diferente não compartilha cooldown.
    const outroNumero = await bot.handle(
      ctx("olá", { numero: "5511888888888", remoteJid: "5511888888888@s.whatsapp.net" }),
    );
    expect(outroNumero?.ruleId).toBe("autoresposta");
  });

  it("ignora mensagens próprias e de grupo", async () => {
    const bot = createBot(new InMemoryCooldownStore());
    expect(await bot.handle(ctx("agendar", { fromMe: true }))).toBeNull();
    expect(await bot.handle(ctx("agendar", { isGroup: true }))).toBeNull();
  });
});
