import { describe, expect, it } from "vitest";

import { buildInstanceName } from "@/lib/server/evolution-admin";

describe("buildInstanceName", () => {
  it("prefixa com lustro-", () => {
    expect(buildInstanceName("salao-do-jose")).toBe("lustro-salao-do-jose");
  });

  it("usa slug literal (sem normalizar)", () => {
    // Slug ja vem normalizado pelo signup (PBI-49). Nao reprocessa aqui
    // pra estabilidade: a instancia tem que bater com o que ja existe no
    // provider Evolution.
    expect(buildInstanceName("barbearia-demo")).toBe("lustro-barbearia-demo");
  });

  it("preserva slug curto", () => {
    expect(buildInstanceName("abc")).toBe("lustro-abc");
  });
});
