import { describe, expect, it } from "vitest";

import { phoneFromJid } from "@/lib/server/whatsapp-api";

describe("phoneFromJid", () => {
  it("extrai os dígitos de JID de contato normal", () => {
    expect(phoneFromJid("5511912345678@s.whatsapp.net")).toBe("5511912345678");
  });

  it("remove sufixo de device (:N)", () => {
    expect(phoneFromJid("5511912345678:12@s.whatsapp.net")).toBe("5511912345678");
  });

  it("JID @lid não tem telefone extraível", () => {
    expect(phoneFromJid("245826848817219@lid")).toBe("");
  });

  it("grupo e broadcast não têm telefone", () => {
    expect(phoneFromJid("123456789-987654@g.us")).toBe("");
    expect(phoneFromJid("status@broadcast")).toBe("");
  });

  it("string vazia devolve vazio", () => {
    expect(phoneFromJid("")).toBe("");
  });
});
