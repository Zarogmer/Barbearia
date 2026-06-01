"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createPackage,
  deletePackage,
  PackageError,
  purchasePackage,
  refundSession,
  updatePackage,
} from "@/lib/server/packages";
import {
  packageFormDataToInput,
  packageSchema,
} from "@/lib/validators/package";

import type { PackageFormState, PackageResult } from "./state";

async function requireOwner(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Apenas OWNER pode gerenciar pacotes." };
  return { orgId: owner.organizationId };
}

function collectFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString();
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function savePackageAction(
  _prev: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = packageSchema.safeParse(packageFormDataToInput(formData));
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    if (parsed.data.id) {
      await updatePackage(ctx.orgId, {
        id: parsed.data.id,
        name: parsed.data.name,
        serviceId: parsed.data.serviceId,
        sessionsCount: parsed.data.sessionsCount,
        priceCents: parsed.data.priceCents,
        expiresInDays: parsed.data.expiresInDays ?? null,
        active: parsed.data.active,
      });
      revalidatePath("/admin/pacotes");
      return { ok: true, packageId: parsed.data.id };
    }
    const r = await createPackage(ctx.orgId, {
      name: parsed.data.name,
      serviceId: parsed.data.serviceId,
      sessionsCount: parsed.data.sessionsCount,
      priceCents: parsed.data.priceCents,
      expiresInDays: parsed.data.expiresInDays ?? null,
      active: parsed.data.active,
    });
    revalidatePath("/admin/pacotes");
    return { ok: true, packageId: r.id };
  } catch (e) {
    console.error("savePackage failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function deletePackageAction(id: string): Promise<PackageResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await deletePackage(ctx.orgId, id);
    revalidatePath("/admin/pacotes");
    return { ok: true };
  } catch (e) {
    if (e instanceof PackageError) return { error: e.message };
    console.error("deletePackage failed:", e);
    return { error: "Não foi possível remover." };
  }
}

export async function purchasePackageAction(
  packageId: string,
  customerUserId: string,
): Promise<PackageResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await purchasePackage(ctx.orgId, packageId, customerUserId);
    revalidatePath(`/admin/clientes/${customerUserId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof PackageError) return { error: e.message };
    console.error("purchasePackage failed:", e);
    return { error: "Não foi possível vender." };
  }
}

export async function refundSessionAction(
  customerPackageId: string,
  customerUserId: string,
): Promise<PackageResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };
  try {
    await refundSession(ctx.orgId, customerPackageId);
    revalidatePath(`/admin/clientes/${customerUserId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof PackageError) return { error: e.message };
    console.error("refundSession failed:", e);
    return { error: "Não foi possível estornar." };
  }
}
