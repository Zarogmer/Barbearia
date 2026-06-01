import { z } from "zod";

const UUID = z.string().uuid("ID inválido");

export const packageSchema = z.object({
  id: UUID.optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo (máx 80)"),
  serviceId: UUID,
  sessionsCount: z.coerce
    .number()
    .int("Quantidade inválida")
    .min(1, "Mínimo 1 sessão")
    .max(200, "Máximo 200 sessões"),
  priceCents: z.coerce
    .number()
    .int()
    .min(0, "Preço inválido")
    .max(10_000_000, "Preço alto demais"),
  expiresInDays: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 dia")
    .max(3650, "Máximo 10 anos")
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.literal(0).transform(() => undefined)),
  active: z.boolean().default(true),
});

export type PackageInput = z.infer<typeof packageSchema>;

export function packageFormDataToInput(formData: FormData): unknown {
  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const priceReais = Number(opt("priceReais") ?? "0");
  return {
    id: opt("id"),
    name: opt("name") ?? "",
    serviceId: opt("serviceId") ?? "",
    sessionsCount: opt("sessionsCount") ?? "1",
    priceCents: Math.round(priceReais * 100),
    expiresInDays: opt("expiresInDays") ?? "",
    active:
      formData.get("active") === "on" || formData.get("active") === "true",
  };
}
