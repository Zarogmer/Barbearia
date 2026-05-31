"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/db";

const inputSchema = z.object({
  template: z
    .string()
    .trim()
    .max(500, "Template muito longo (máx 500 chars)")
    .optional()
    .or(z.literal("")),
});

export async function saveReminderTemplateAction(input: {
  template: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Sem permissão." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Template inválido.",
    };
  }

  const value =
    parsed.data.template && parsed.data.template.trim().length > 0
      ? parsed.data.template.trim()
      : null;

  try {
    await withTenant(owner.organizationId, async (db) => {
      await db.organization.update({
        where: { id: owner.organizationId },
        data: { reminderTemplate: value },
      });
    });
  } catch (e) {
    console.error("saveReminderTemplate failed:", e);
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidatePath("/admin/configuracoes");
  return { ok: true };
}
