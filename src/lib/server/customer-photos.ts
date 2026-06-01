import "server-only";

import { withTenant } from "@/lib/db";

export type PhotoTag = "BEFORE" | "AFTER" | "INSPIRATION" | "OTHER";

export type CustomerPhotoRow = {
  id: string;
  url: string;
  tag: PhotoTag;
  caption: string | null;
  createdAt: Date;
};

export async function listCustomerPhotos(
  organizationId: string,
  customerUserId: string,
  opts: { tag?: PhotoTag } = {},
): Promise<CustomerPhotoRow[]> {
  return withTenant(organizationId, async (db) => {
    return db.customerPhoto.findMany({
      where: {
        customerUserId,
        ...(opts.tag ? { tag: opts.tag } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        tag: true,
        caption: true,
        createdAt: true,
      },
    });
  });
}

export async function createCustomerPhoto(
  organizationId: string,
  input: {
    customerUserId: string;
    url: string;
    tag: PhotoTag;
    caption?: string | null;
  },
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.customerPhoto.create({
      data: {
        organizationId,
        customerUserId: input.customerUserId,
        url: input.url,
        tag: input.tag,
        caption: input.caption ?? null,
      },
      select: { id: true },
    });
  });
}

export async function deleteCustomerPhoto(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.customerPhoto.delete({ where: { id } });
  });
}
