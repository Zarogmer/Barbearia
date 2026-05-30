"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import {
  OrganizationError,
  updateOrganization,
} from "@/lib/server/organizations";
import {
  organizationFormDataToInput,
  updateOrganizationSchema,
} from "@/lib/validators/organization";

import type { OrgConfigState } from "./state";

async function requireOwnerOrgId(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada. Faça login novamente." };
  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) {
    return { error: "Você não tem permissão para alterar configurações." };
  }
  return { orgId: ownerMembership.organizationId };
}

export async function updateOrganizationAction(
  _prev: OrgConfigState,
  formData: FormData,
): Promise<OrgConfigState> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = updateOrganizationSchema.safeParse(
    organizationFormDataToInput(formData),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos destacados.", fieldErrors };
  }

  try {
    await updateOrganization(ctx.orgId, parsed.data);
  } catch (e) {
    if (e instanceof OrganizationError) {
      if (e.code === "SLUG_TAKEN") {
        return { error: e.message, fieldErrors: { slug: e.message } };
      }
      return { error: e.message };
    }
    console.error("updateOrganization failed:", e);
    return { error: "Não foi possível salvar." };
  }

  revalidatePath("/admin/configuracoes");
  // Vitrine pública é cacheada com tag — invalida explicitamente.
  revalidateTag("org-public-profile");
  // Revalida rota pública pra refletir mudança de slug imediatamente
  revalidatePath("/", "layout");
  return { ok: true };
}
