import "server-only";

import { withTenant } from "@/lib/db";
import type { CreatePostInput } from "@/lib/validators/post";

export type PostItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
};

export async function listPosts(
  organizationId: string,
  limit = 30,
): Promise<PostItem[]> {
  return withTenant(organizationId, async (db) => {
    return db.post.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, imageUrl: true, caption: true, createdAt: true },
    });
  });
}

export async function createPost(
  organizationId: string,
  input: CreatePostInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.post.create({
      data: {
        organizationId,
        imageUrl: input.imageUrl,
        caption: input.caption,
      },
      select: { id: true },
    });
  });
}

export async function deletePost(
  organizationId: string,
  postId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    // RLS garante que só apaga post da própria org
    await db.post.deleteMany({ where: { id: postId } });
  });
}
