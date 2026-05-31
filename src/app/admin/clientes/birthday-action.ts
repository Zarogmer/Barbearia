"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { setCustomerBirthDate } from "@/lib/server/birthdays";

const inputSchema = z.object({
  userId: z.string().uuid(),
  // YYYY-MM-DD ou string vazia (limpar)
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use formato AAAA-MM-DD")
    .optional()
    .or(z.literal("")),
});

export type BirthDateState =
  | { ok?: true; error?: undefined }
  | { ok?: undefined; error: string };

export async function setBirthDateAction(
  input: { userId: string; birthDate: string },
): Promise<BirthDateState> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Sem permissão." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const date =
    parsed.data.birthDate && parsed.data.birthDate !== ""
      ? new Date(`${parsed.data.birthDate}T00:00:00Z`)
      : null;

  try {
    await setCustomerBirthDate(owner.organizationId, parsed.data.userId, date);
  } catch (e) {
    console.error("setBirthDate failed:", e);
    return { error: "Não foi possível salvar a data." };
  }

  revalidatePath("/admin/aniversariantes");
  revalidatePath(`/admin/clientes/${parsed.data.userId}`);
  return { ok: true };
}
