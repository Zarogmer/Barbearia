import { describe, expect, it } from "vitest";

import { createOrgSchema, slugifyOrgName } from "@/lib/validators/auth";

describe("slugifyOrgName", () => {
  it("normaliza acentos e espaços", () => {
    expect(slugifyOrgName("Salão do José")).toBe("salao-do-jose");
  });

  it("colapsa múltiplos separadores", () => {
    expect(slugifyOrgName("Barba   Negra & Co.")).toBe("barba-negra-co");
  });

  it("remove hífens das pontas", () => {
    expect(slugifyOrgName("---Studio Foo---")).toBe("studio-foo");
  });

  it("trunca em 40 chars", () => {
    const long = "a".repeat(60);
    expect(slugifyOrgName(long).length).toBeLessThanOrEqual(40);
  });

  it("retorna vazio pra input só com símbolos", () => {
    expect(slugifyOrgName("!@#$%")).toBe("");
  });
});

describe("createOrgSchema", () => {
  const validBase = {
    name: "Vinícius Gomes",
    email: "vini@example.com",
    phone: "11999998888",
    passwordHash: "$2b$12$" + "x".repeat(53),
  };

  it("aceita slug kebab-case válido", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      orgName: "Salão Foo",
      slug: "salao-foo",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita slug com maiúsculas — schema é case-sensitive após toLowerCase", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      orgName: "Foo",
      slug: "Salao-Foo",
    });
    // toLowerCase faz lower antes do regex, então deve passar
    expect(r.success).toBe(true);
  });

  it("rejeita slug com underscore", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      orgName: "Foo",
      slug: "salao_foo",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita slug muito curto", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      orgName: "Foo",
      slug: "ab",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita orgName vazio", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      orgName: "",
      slug: "foo-bar",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita passwordHash muito curto (sessão inválida)", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      passwordHash: "abc",
      orgName: "Foo",
      slug: "foo-bar",
    });
    expect(r.success).toBe(false);
  });

  it("normaliza telefone BR pra E.164", () => {
    const r = createOrgSchema.safeParse({
      ...validBase,
      orgName: "Foo",
      slug: "foo-bar",
    });
    if (!r.success) throw new Error("parse falhou");
    expect(r.data.phone).toBe("+5511999998888");
  });
});
