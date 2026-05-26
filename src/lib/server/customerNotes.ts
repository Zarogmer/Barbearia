import "server-only";

import { withTenant } from "@/lib/db";
import type { CustomerNoteInput } from "@/lib/validators/customer";

export type CustomerNoteItem = {
  id: string;
  body: string;
  createdAt: Date;
  createdByUserId: string;
  createdByName: string | null;
};

export async function listCustomerNotes(
  organizationId: string,
  customerUserId: string,
): Promise<CustomerNoteItem[]> {
  const rows = await withTenant(organizationId, (db) =>
    db.customerNote.findMany({
      where: { customerUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        createdByUserId: true,
      },
    }),
  );

  if (rows.length === 0) return [];

  // createdBy é User global (sem RLS) — busca em batch com prismaAdmin
  const { prismaAdmin } = await import("@/lib/db");
  const authorIds = Array.from(new Set(rows.map((r) => r.createdByUserId)));
  const authors = await prismaAdmin.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(authors.map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    createdByUserId: r.createdByUserId,
    createdByName: nameById.get(r.createdByUserId) ?? null,
  }));
}

export async function createCustomerNote(
  organizationId: string,
  createdByUserId: string,
  input: CustomerNoteInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, (db) =>
    db.customerNote.create({
      data: {
        organizationId,
        customerUserId: input.customerUserId,
        body: input.body,
        createdByUserId,
      },
      select: { id: true },
    }),
  );
}

export async function deleteCustomerNote(
  organizationId: string,
  noteId: string,
): Promise<void> {
  await withTenant(organizationId, (db) =>
    db.customerNote.deleteMany({ where: { id: noteId } }),
  );
}
