"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import {
  customerProfileFormDataToInput,
  updateCustomerProfileSchema,
} from "@/lib/validators/customerProfile";

import type { ProfileActionState } from "./state";

export async function updateCustomerProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada. Faça login novamente." };

  const parsed = updateCustomerProfileSchema.safeParse(
    customerProfileFormDataToInput(formData),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  try {
    // User é tabela global (sem RLS) — prismaAdmin direto.
    // O filtro por id garante que só atualiza o próprio User.
    await prismaAdmin.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name, phone: parsed.data.phone },
    });
  } catch (e) {
    console.error("updateCustomerProfile failed:", e);
    return { error: "Não foi possível salvar." };
  }

  revalidatePath("/", "layout"); // session.user.name é lido em vários lugares
  return { ok: true };
}
