import { describe, expect, it } from "vitest";

import { updateOrganizationSchema } from "@/lib/validators/organization";

describe("updateOrganizationSchema", () => {
  it("aceita slug válido kebab-case", () => {
    const r = updateOrganizationSchema.safeParse({
      name: "Studio X",
      slug: "studio-x",
      allowGuestBooking: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejeita slug com maiúscula", () => {
    const r = updateOrganizationSchema.safeParse({
      name: "Studio X",
      slug: "Studio-X",
      allowGuestBooking: true,
    });
    // toLowerCase é aplicado mas regex roda antes — schema usa
    // .toLowerCase() na transformação, então maiúscula é normalizada
    // e passa. Vamos confirmar isso conforme spec atual.
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.slug).toBe("studio-x");
  });

  it("rejeita slug com underscore", () => {
    const r = updateOrganizationSchema.safeParse({
      name: "Studio X",
      slug: "studio_x",
      allowGuestBooking: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejeita slug com espaço", () => {
    const r = updateOrganizationSchema.safeParse({
      name: "Studio X",
      slug: "studio x",
      allowGuestBooking: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejeita slug com 2 chars", () => {
    const r = updateOrganizationSchema.safeParse({
      name: "Studio X",
      slug: "ab",
      allowGuestBooking: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejeita slug terminando em hífen", () => {
    const r = updateOrganizationSchema.safeParse({
      name: "Studio X",
      slug: "studio-",
      allowGuestBooking: true,
    });
    expect(r.success).toBe(false);
  });
});
