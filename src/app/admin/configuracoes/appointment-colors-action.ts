"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { setAppointmentColors } from "@/lib/server/appointment-colors";

const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use hex tipo #RRGGBB");

const inputSchema = z.object({
  confirmed: HEX,
  completed: HEX,
  cancelled: HEX,
  noShow: HEX,
});

export async function saveAppointmentColorsAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Sem permissão." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Cores inválidas.",
    };
  }

  try {
    await setAppointmentColors(owner.organizationId, parsed.data);
  } catch (e) {
    console.error("setAppointmentColors failed:", e);
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function resetAppointmentColorsAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Sem permissão." };

  try {
    await setAppointmentColors(owner.organizationId, null);
  } catch (e) {
    console.error("resetAppointmentColors failed:", e);
    return { ok: false, error: "Não foi possível resetar." };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/agenda");
  return { ok: true };
}
