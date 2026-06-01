"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createCustomerPhoto,
  deleteCustomerPhoto,
  type PhotoTag,
} from "@/lib/server/customer-photos";

async function requireAdminOrg(): Promise<
  { orgId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const m = session.user.memberships[0];
  if (!m) return { error: "Sem organização." };
  return { orgId: m.organizationId };
}

const VALID_TAGS: PhotoTag[] = ["BEFORE", "AFTER", "INSPIRATION", "OTHER"];

export async function addCustomerPhotoAction(
  customerUserId: string,
  input: { url: string; tag: PhotoTag; caption?: string },
): Promise<{ ok?: boolean; id?: string; error?: string }> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  if (!input.url || !input.url.startsWith("http")) {
    return { error: "URL da foto inválida." };
  }
  if (!VALID_TAGS.includes(input.tag)) {
    return { error: "Tag inválida." };
  }

  try {
    const r = await createCustomerPhoto(ctx.orgId, {
      customerUserId,
      url: input.url.trim(),
      tag: input.tag,
      caption: input.caption?.trim() || null,
    });
    revalidatePath(`/admin/clientes/${customerUserId}`);
    return { ok: true, id: r.id };
  } catch (e) {
    console.error("addCustomerPhoto failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function deleteCustomerPhotoAction(
  id: string,
  customerUserId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deleteCustomerPhoto(ctx.orgId, id);
    revalidatePath(`/admin/clientes/${customerUserId}`);
    return { ok: true };
  } catch (e) {
    console.error("deleteCustomerPhoto failed:", e);
    return { error: "Não foi possível remover." };
  }
}
