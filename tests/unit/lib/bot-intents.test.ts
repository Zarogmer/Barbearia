import { describe, expect, it } from "vitest";

import { parseBotIntent } from "@/lib/bot-intents";

describe("parseBotIntent", () => {
  it("CANCELAR em qualquer caixa/acentuação vira CANCEL", () => {
    expect(parseBotIntent("CANCELAR")).toEqual({ type: "CANCEL" });
    expect(parseBotIntent("cancelar")).toEqual({ type: "CANCEL" });
    expect(parseBotIntent("  Cancelar!! ")).toEqual({ type: "CANCEL" });
    expect(parseBotIntent("cancela")).toEqual({ type: "CANCEL" });
  });

  it("SIM CANCELAR vira CONFIRM_CANCEL (com pontuação/espaços extras)", () => {
    expect(parseBotIntent("SIM CANCELAR")).toEqual({ type: "CONFIRM_CANCEL" });
    expect(parseBotIntent("sim, cancelar")).toEqual({ type: "CONFIRM_CANCEL" });
    expect(parseBotIntent(" sim   cancelar ")).toEqual({
      type: "CONFIRM_CANCEL",
    });
  });

  it("SIM sozinho é YES (não confirma cancelamento)", () => {
    expect(parseBotIntent("sim")).toEqual({ type: "YES" });
  });

  it("AGENDAR/REAGENDAR/REMARCAR viram RESCHEDULE", () => {
    expect(parseBotIntent("agendar")).toEqual({ type: "RESCHEDULE" });
    expect(parseBotIntent("REAGENDAR")).toEqual({ type: "RESCHEDULE" });
    expect(parseBotIntent("remarcar")).toEqual({ type: "RESCHEDULE" });
  });

  it("número 1-9 vira PICK", () => {
    expect(parseBotIntent("1")).toEqual({ type: "PICK", n: 1 });
    expect(parseBotIntent(" 3 ")).toEqual({ type: "PICK", n: 3 });
    expect(parseBotIntent("9")).toEqual({ type: "PICK", n: 9 });
  });

  it("número fora de 1-9 ou composto não é PICK", () => {
    expect(parseBotIntent("0")).toEqual({ type: "UNKNOWN" });
    expect(parseBotIntent("12")).toEqual({ type: "UNKNOWN" });
  });

  it("AJUDA e MENU viram HELP", () => {
    expect(parseBotIntent("ajuda")).toEqual({ type: "HELP" });
    expect(parseBotIntent("Menu")).toEqual({ type: "HELP" });
  });

  it("texto livre, vazio ou emoji é UNKNOWN", () => {
    expect(parseBotIntent("oi, tudo bem?")).toEqual({ type: "UNKNOWN" });
    expect(parseBotIntent("")).toEqual({ type: "UNKNOWN" });
    expect(parseBotIntent("   ")).toEqual({ type: "UNKNOWN" });
    expect(parseBotIntent("👍")).toEqual({ type: "UNKNOWN" });
    expect(parseBotIntent("quero cancelar meu horário")).toEqual({
      type: "UNKNOWN",
    });
  });
});
