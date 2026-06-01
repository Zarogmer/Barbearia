import "server-only";

import { withTenant } from "@/lib/db";

export type AdminRoom = {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
};

export async function listRooms(
  organizationId: string,
  opts: { onlyActive?: boolean } = {},
): Promise<AdminRoom[]> {
  return withTenant(organizationId, async (db) => {
    return db.room.findMany({
      where: opts.onlyActive ? { active: true } : undefined,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, active: true, createdAt: true },
    });
  });
}

export async function createRoom(
  organizationId: string,
  input: { name: string; active?: boolean },
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.room.create({
      data: {
        organizationId,
        name: input.name,
        active: input.active ?? true,
      },
      select: { id: true },
    });
  });
}

export async function updateRoom(
  organizationId: string,
  input: { id: string; name: string; active: boolean },
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.room.update({
      where: { id: input.id },
      data: { name: input.name, active: input.active },
    });
  });
}

export async function deleteRoom(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.room.delete({ where: { id } });
  });
}
