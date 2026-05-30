"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  ProductError,
  createInventoryMovement,
  createProduct,
  deactivateProduct,
  updateProduct,
} from "@/lib/server/products";
import {
  createProductSchema,
  inventoryMovementSchema,
  productFormDataToInput,
  updateProductSchema,
} from "@/lib/validators/product";

export type ProductActionState =
  | { ok?: true; error?: undefined; fieldErrors?: undefined }
  | { ok?: undefined; error: string; fieldErrors?: Record<string, string> };

async function requireOwnerOrg(): Promise<
  { orgId: string; userId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return { error: "Você precisa ser OWNER para gerenciar estoque." };
  }
  return { orgId: owner.organizationId, userId: session.user.id };
}

function collectFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString();
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = createProductSchema.safeParse(productFormDataToInput(formData));
  if (!parsed.success) {
    return {
      error: "Confira os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    await createProduct(ctx.orgId, parsed.data);
  } catch (e) {
    if (e instanceof ProductError) {
      if (e.code === "SKU_TAKEN") {
        return { error: e.message, fieldErrors: { sku: e.message } };
      }
      return { error: e.message };
    }
    console.error("createProduct failed:", e);
    return { error: "Não foi possível salvar o produto." };
  }

  revalidatePath("/admin/estoque");
  return { ok: true };
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "ID inválido." };

  const parsed = updateProductSchema.safeParse({
    id,
    ...(productFormDataToInput(formData) as Record<string, unknown>),
  });
  if (!parsed.success) {
    return {
      error: "Confira os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateProduct(ctx.orgId, parsed.data);
  } catch (e) {
    if (e instanceof ProductError) {
      if (e.code === "SKU_TAKEN") {
        return { error: e.message, fieldErrors: { sku: e.message } };
      }
      return { error: e.message };
    }
    console.error("updateProduct failed:", e);
    return { error: "Não foi possível atualizar o produto." };
  }

  revalidatePath("/admin/estoque");
  return { ok: true };
}

export async function deactivateProductAction(
  productId: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deactivateProduct(ctx.orgId, productId);
  } catch (e) {
    console.error("deactivateProduct failed:", e);
    return { error: "Não foi possível desativar o produto." };
  }

  revalidatePath("/admin/estoque");
  return { ok: true };
}

export async function createMovementAction(input: {
  productId: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  reason?: string;
}): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireOwnerOrg();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = inventoryMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }

  try {
    await createInventoryMovement(ctx.orgId, ctx.userId, parsed.data);
  } catch (e) {
    console.error("createInventoryMovement failed:", e);
    return { error: "Não foi possível registrar movimentação." };
  }

  revalidatePath("/admin/estoque");
  return { ok: true };
}
