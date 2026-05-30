"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Marca o checklist de onboarding como dismissed (PBI-27).
 * Cookie por 1 ano (idêntico ao padrão do tema em PBI-28).
 */
export async function dismissOnboardingAction(): Promise<{ ok: true }> {
  const c = await cookies();
  c.set("onboardingDismissed", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
