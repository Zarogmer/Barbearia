"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  createRoom,
  deleteRoom,
  updateRoom,
} from "@/lib/server/rooms";

const UUID = z.string().uuid("ID inválido");

const schema = z.object({
  id: UUID.optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(60, "Nome muito longo"),
  active: z.boolean().default(true),
});

export type RoomFormState = {
  ok?: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialRoomFormState: RoomFormState = {};

async function requireOwner(): Promise<
  { orgId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Apenas OWNER." };
  return { orgId: owner.organizationId };
}

export async function saveRoomAction(
  _prev: RoomFormState,
  formData: FormData,
): Promise<RoomFormState> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  const opt = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = schema.safeParse({
    id: opt("id") || undefined,
    name: opt("name") ?? "",
    active:
      formData.get("active") === "on" || formData.get("active") === "true",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }
  try {
    if (parsed.data.id) {
      await updateRoom(ctx.orgId, {
        id: parsed.data.id,
        name: parsed.data.name,
        active: parsed.data.active,
      });
      revalidatePath("/admin/salas");
      return { ok: true, id: parsed.data.id };
    }
    const r = await createRoom(ctx.orgId, {
      name: parsed.data.name,
      active: parsed.data.active,
    });
    revalidatePath("/admin/salas");
    return { ok: true, id: r.id };
  } catch (e) {
    console.error("saveRoom failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function deleteRoomAction(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deleteRoom(ctx.orgId, id);
    revalidatePath("/admin/salas");
    return { ok: true };
  } catch (e) {
    console.error("deleteRoom failed:", e);
    return { error: "Não foi possível remover (talvez já tenha appointments)." };
  }
}
