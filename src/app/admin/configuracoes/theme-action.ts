"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  isValidTheme,
  persistOrgTheme,
  persistTheme,
  type ThemeId,
} from "@/lib/server/theme";

export async function setThemeAction(input: {
  theme: string;
  dark: boolean;
  saveAsOrgDefault?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidTheme(input.theme)) {
    return { ok: false, error: "Tema inválido." };
  }
  const themeId = input.theme as ThemeId;
  const dark = !!input.dark;

  await persistTheme({ theme: themeId, dark });

  if (input.saveAsOrgDefault) {
    const session = await auth();
    const owner = session?.user.memberships.find((m) => m.role === "OWNER");
    if (!owner) {
      return {
        ok: false,
        error: "Só OWNER pode salvar como tema padrão da barbearia.",
      };
    }
    await persistOrgTheme(owner.organizationId, { theme: themeId, dark });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
