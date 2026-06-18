import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";

describe("forgotPasswordSchema", () => {
  it("aceita email válido e normaliza pra lowercase", () => {
    const r = forgotPasswordSchema.safeParse({ email: "VINI@EXAMPLE.COM" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("vini@example.com");
  });

  it("rejeita email inválido", () => {
    expect(forgotPasswordSchema.safeParse({ email: "abc" }).success).toBe(false);
  });

  it("rejeita email vazio", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const validToken = "a".repeat(36) + "." + "b".repeat(64);

  it("aceita token longo + senhas iguais ≥8 chars", () => {
    const r = resetPasswordSchema.safeParse({
      token: validToken,
      password: "senha1234",
      confirmPassword: "senha1234",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita senhas diferentes", () => {
    const r = resetPasswordSchema.safeParse({
      token: validToken,
      password: "senha1234",
      confirmPassword: "senha9999",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "confirmPassword");
      expect(issue?.message).toMatch(/não conferem/i);
    }
  });

  it("rejeita senha curta", () => {
    const r = resetPasswordSchema.safeParse({
      token: validToken,
      password: "abc",
      confirmPassword: "abc",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita token muito curto", () => {
    const r = resetPasswordSchema.safeParse({
      token: "abc",
      password: "senha1234",
      confirmPassword: "senha1234",
    });
    expect(r.success).toBe(false);
  });
});
