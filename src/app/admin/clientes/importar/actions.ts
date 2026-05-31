"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  importCustomers,
  type ImportPerson,
  type ImportResult,
} from "@/lib/server/customer-import";

const inputSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
      }),
    )
    .min(1, "Nenhuma linha")
    .max(2000, "Máximo 2000 por importação"),
});

export async function importCustomersAction(input: {
  rows: Array<Partial<ImportPerson>>;
}): Promise<
  { ok: true; result: ImportResult } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Sem permissão." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input inválido.",
    };
  }

  try {
    const result = await importCustomers(owner.organizationId, parsed.data.rows);
    revalidatePath("/admin/clientes");
    return { ok: true, result };
  } catch (e) {
    console.error("importCustomers failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha na importação.",
    };
  }
}
