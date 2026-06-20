"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  createQuote,
  deleteQuote,
  updateQuoteStatus,
  type QuoteItemType,
  type QuoteStatus,
} from "@/lib/server/quotes";

const UUID = z.string().uuid("ID inválido");
const DATE = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");

const itemSchema = z.object({
  type: z.enum(["SERVICE", "PRODUCT", "MANUAL"]),
  refId: UUID.optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2, "Nome").max(120),
  quantity: z.coerce.number().int().min(1).max(999),
  unitPriceCents: z.coerce.number().int().min(0).max(10_000_000),
});

const createSchema = z.object({
  customerUserId: UUID.optional().or(z.literal("").transform(() => undefined)),
  customerName: z.string().trim().min(2, "Nome").max(80),
  customerPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  expiresAt: DATE.optional().or(z.literal("").transform(() => undefined)),
  discountCents: z.coerce.number().int().min(0).max(10_000_000).default(0),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  items: z.array(itemSchema).min(1, "Adicione pelo menos 1 item"),
});

export type QuoteFormState = {
  ok?: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialQuoteFormState: QuoteFormState = {};

async function requireAdminOrg(): Promise<
  { orgId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const m = session.user.memberships[0];
  if (!m) return { error: "Sem organização." };
  return { orgId: m.organizationId };
}

export async function createQuoteAction(
  input: z.input<typeof createSchema>,
): Promise<QuoteFormState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  try {
    const r = await createQuote(ctx.orgId, {
      customerUserId: parsed.data.customerUserId ?? null,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone ?? null,
      expiresAt: parsed.data.expiresAt
        ? new Date(`${parsed.data.expiresAt}T00:00:00Z`)
        : null,
      discountCents: parsed.data.discountCents,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items.map(
        (i: z.infer<typeof itemSchema>) => ({
          type: i.type as QuoteItemType,
          refId: i.refId ?? null,
          name: i.name,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
        }),
      ),
    });
    revalidatePath("/admin/orcamentos");
    return { ok: true, id: r.id };
  } catch (e) {
    console.error("createQuote failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function updateQuoteStatusAction(
  id: string,
  status: QuoteStatus,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await updateQuoteStatus(ctx.orgId, id, status);
    revalidatePath("/admin/orcamentos");
    return { ok: true };
  } catch (e) {
    console.error("updateQuoteStatus failed:", e);
    return { error: "Não foi possível atualizar." };
  }
}

export async function deleteQuoteAction(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deleteQuote(ctx.orgId, id);
    revalidatePath("/admin/orcamentos");
    return { ok: true };
  } catch (e) {
    console.error("deleteQuote failed:", e);
    return { error: "Não foi possível remover." };
  }
}
