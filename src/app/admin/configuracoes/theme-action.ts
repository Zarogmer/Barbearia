"use server";

import { revalidatePath } from "next/cache";

import { isValidTheme, persistTheme, type ThemeId } from "@/lib/server/theme";

export async function setThemeAction(input: {
  theme: string;
  dark: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidTheme(input.theme)) {
    return { ok: false, error: "Tema inválido." };
  }
  await persistTheme({ theme: input.theme as ThemeId, dark: !!input.dark });
  revalidatePath("/", "layout");
  return { ok: true };
}
