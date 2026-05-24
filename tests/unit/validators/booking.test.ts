import { describe, expect, it } from "vitest";

import { confirmBookingSchema } from "@/lib/validators/booking";

function makeValid() {
  return {
    orgSlug: "barbearia-demo",
    serviceId: "00000000-0000-0000-0000-000000000001",
    professionalId: "00000000-0000-0000-0000-000000000002",
    date: "2030-06-01",
    time: "09:30",
    customerName: "João Silva",
    customerEmail: "joao@example.com",
    customerPhone: "11999998888",
    acceptedTerms: true,
  };
}

describe("confirmBookingSchema", () => {
  it("aceita input válido completo", () => {
    const r = confirmBookingSchema.safeParse(makeValid());
    expect(r.success).toBe(true);
  });

  it("rejeita acceptedTerms = false", () => {
    const r = confirmBookingSchema.safeParse({ ...makeValid(), acceptedTerms: false });
    expect(r.success).toBe(false);
  });

  it("rejeita email inválido", () => {
    const r = confirmBookingSchema.safeParse({
      ...makeValid(),
      customerEmail: "naoeumailll",
    });
    expect(r.success).toBe(false);
  });

  it("lowercase + trim no email", () => {
    const r = confirmBookingSchema.safeParse({
      ...makeValid(),
      customerEmail: "  JoAo@Example.COM ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customerEmail).toBe("joao@example.com");
  });

  it("aceita phone vazio", () => {
    const r = confirmBookingSchema.safeParse({ ...makeValid(), customerPhone: "" });
    expect(r.success).toBe(true);
    // Comportamento atual: string vazia passa direto.
    if (r.success) expect(r.data.customerPhone ?? "").toBe("");
  });

  it("rejeita date com formato errado", () => {
    const r = confirmBookingSchema.safeParse({ ...makeValid(), date: "01/06/2030" });
    expect(r.success).toBe(false);
  });
});
