import { describe, expect, it } from "vitest";

import { nextPollPlan } from "@/lib/backoff";

describe("nextPollPlan", () => {
  it("sem erros usa o intervalo base", () => {
    expect(nextPollPlan(0)).toEqual({ action: "wait", delayMs: 3_000 });
  });

  it("dobra o intervalo a cada erro consecutivo", () => {
    expect(nextPollPlan(1)).toEqual({ action: "wait", delayMs: 6_000 });
    expect(nextPollPlan(2)).toEqual({ action: "wait", delayMs: 12_000 });
    expect(nextPollPlan(3)).toEqual({ action: "wait", delayMs: 24_000 });
  });

  it("respeita o teto de 30s", () => {
    expect(nextPollPlan(4)).toEqual({ action: "wait", delayMs: 30_000 });
  });

  it("para após 5 erros consecutivos", () => {
    expect(nextPollPlan(5)).toEqual({ action: "stop" });
    expect(nextPollPlan(99)).toEqual({ action: "stop" });
  });

  it("input negativo ou fracionário é tratado como zero/floor", () => {
    expect(nextPollPlan(-3)).toEqual({ action: "wait", delayMs: 3_000 });
    expect(nextPollPlan(1.9)).toEqual({ action: "wait", delayMs: 6_000 });
  });

  it("aceita opções customizadas", () => {
    expect(nextPollPlan(2, { baseMs: 1_000, factor: 3, maxMs: 100_000, giveUpAfter: 4 })).toEqual({
      action: "wait",
      delayMs: 9_000,
    });
    expect(nextPollPlan(4, { giveUpAfter: 4 })).toEqual({ action: "stop" });
  });
});
