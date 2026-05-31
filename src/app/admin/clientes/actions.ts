"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createCustomer } from "@/lib/server/customer-create";
import {
  createCustomerNote,
  deleteCustomerNote,
} from "@/lib/server/customerNotes";
import {
  createCustomerFormDataToInput,
  createCustomerSchema,
  customerNoteSchema,
} from "@/lib/validators/customer";

import type {
  CreateCustomerState,
  DeleteNoteResult,
  NoteActionState,
} from "./state";

async function requireAdminOrg(): Promise<
  { orgId: string; userId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  const membership = session.user.memberships[0];
  if (!membership) return { error: "Você não pertence a nenhuma organização." };
  return { orgId: membership.organizationId, userId: session.user.id };
}

export async function createNoteAction(
  customerUserId: string,
  _prev: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = customerNoteSchema.safeParse({
    customerUserId,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  try {
    await createCustomerNote(ctx.orgId, ctx.userId, parsed.data);
  } catch (e) {
    console.error("createNote failed:", e);
    return { error: "Não foi possível salvar a anotação." };
  }

  revalidatePath(`/admin/clientes/${customerUserId}`);
  return { ok: true };
}

export async function createCustomerAction(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = createCustomerSchema.safeParse(
    createCustomerFormDataToInput(formData),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira os campos.", fieldErrors };
  }

  try {
    const result = await createCustomer(ctx.orgId, parsed.data);
    revalidatePath("/admin/clientes");
    return { ok: true, userId: result.userId };
  } catch (e) {
    console.error("createCustomer failed:", e);
    return {
      error: e instanceof Error ? e.message : "Não foi possível cadastrar.",
    };
  }
}

export async function deleteNoteAction(
  noteId: string,
  customerUserId: string,
): Promise<DeleteNoteResult> {
  const ctx = await requireAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deleteCustomerNote(ctx.orgId, noteId);
  } catch (e) {
    console.error("deleteNote failed:", e);
    return { error: "Não foi possível remover." };
  }

  revalidatePath(`/admin/clientes/${customerUserId}`);
  return { ok: true };
}
