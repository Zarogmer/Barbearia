import { describe, expect, it } from "vitest";

import { replyChatSchema } from "@/lib/validators/whatsapp-chat";

describe("replyChatSchema", () => {
  it("aceita JID de contato normal", () => {
    const r = replyChatSchema.safeParse({
      remoteJid: "5511912345678@s.whatsapp.net",
      text: "oi",
    });
    expect(r.success).toBe(true);
  });

  it("aceita JID @lid (identificador anônimo)", () => {
    const r = replyChatSchema.safeParse({
      remoteJid: "245826848817219@lid",
      text: "oi",
    });
    expect(r.success).toBe(true);
  });

  it("aceita sufixo de device no JID", () => {
    const r = replyChatSchema.safeParse({
      remoteJid: "5511912345678:12@s.whatsapp.net",
      text: "oi",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita grupo e JID malformado", () => {
    expect(replyChatSchema.safeParse({ remoteJid: "123@g.us", text: "oi" }).success).toBe(false);
    expect(replyChatSchema.safeParse({ remoteJid: "abc@lid", text: "oi" }).success).toBe(false);
    expect(replyChatSchema.safeParse({ remoteJid: "5511912345678", text: "oi" }).success).toBe(
      false,
    );
  });

  it("rejeita mensagem vazia ou só espaços", () => {
    expect(
      replyChatSchema.safeParse({
        remoteJid: "5511912345678@s.whatsapp.net",
        text: "   ",
      }).success,
    ).toBe(false);
  });

  it("rejeita mensagem acima de 4096 chars", () => {
    expect(
      replyChatSchema.safeParse({
        remoteJid: "5511912345678@s.whatsapp.net",
        text: "a".repeat(4097),
      }).success,
    ).toBe(false);
  });
});
