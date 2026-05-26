"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createPost, deletePost } from "@/lib/server/posts";
import { createPostSchema, postFormDataToInput } from "@/lib/validators/post";

import type { DeletePostResult, PostActionState } from "./state";

async function requireOwnerOrgId(): Promise<{ orgId: string; orgSlug?: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Você precisa ser OWNER para postar." };
  return { orgId: owner.organizationId };
}

export async function createPostAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = createPostSchema.safeParse(postFormDataToInput(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  try {
    await createPost(ctx.orgId, parsed.data);
  } catch (e) {
    console.error("createPost failed:", e);
    return { error: "Não foi possível publicar." };
  }

  revalidatePath("/admin/feed");
  // O feed do cliente também precisa invalidar — vamos por layout pra
  // cobrir qualquer /[orgSlug]/conta/feed cacheado
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<DeletePostResult> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deletePost(ctx.orgId, postId);
  } catch (e) {
    console.error("deletePost failed:", e);
    return { error: "Não foi possível remover." };
  }

  revalidatePath("/admin/feed");
  revalidatePath("/", "layout");
  return { ok: true };
}
