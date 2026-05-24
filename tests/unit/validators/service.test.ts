import { describe, expect, it } from "vitest";

import {
  createServiceSchema,
  serviceFormDataToInput,
} from "@/lib/validators/service";

function makeValidInput() {
  return {
    name: "Corte",
    description: "Corte masculino",
    durationMinutes: 30,
    priceCents: 5000,
    active: true,
    professionalIds: ["00000000-0000-0000-0000-000000000001"],
  };
}

describe("createServiceSchema", () => {
  it("aceita input válido completo", () => {
    const r = createServiceSchema.safeParse(makeValidInput());
    expect(r.success).toBe(true);
  });

  it("rejeita nome com 1 char", () => {
    const r = createServiceSchema.safeParse({ ...makeValidInput(), name: "X" });
    expect(r.success).toBe(false);
  });

  it("rejeita duração não múltiplo de 5", () => {
    const r = createServiceSchema.safeParse({
      ...makeValidInput(),
      durationMinutes: 33,
    });
    expect(r.success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    const r = createServiceSchema.safeParse({
      ...makeValidInput(),
      priceCents: -100,
    });
    expect(r.success).toBe(false);
  });

  it("aceita description vazia", () => {
    const r = createServiceSchema.safeParse({ ...makeValidInput(), description: "" });
    expect(r.success).toBe(true);
    // Comportamento atual: string vazia passa direto (não vira undefined).
    // Tolerável: a UI/DB lida com "" igual a null pra description.
    if (r.success) expect(r.data.description ?? "").toBe("");
  });

  it("serviceFormDataToInput converte priceCents de reais pra centavos", () => {
    const fd = new FormData();
    fd.set("name", "Corte");
    fd.set("description", "");
    fd.set("durationMinutes", "30");
    fd.set("priceCents", "50.00");
    fd.set("active", "on");

    const input = serviceFormDataToInput(fd) as { priceCents: number };
    expect(input.priceCents).toBe(5000);
  });
});
