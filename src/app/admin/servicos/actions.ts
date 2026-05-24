"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createService,
  deactivateOrDeleteService,
  updateService,
} from "@/lib/server/services";
import {
  createServiceSchema,
  serviceFormDataToInput,
  updateServiceSchema,
} from "@/lib/validators/service";

export type ServiceActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const EMPTY: ServiceActionState = {};

async function requireOwnerOrgId(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada. Faça login novamente." };
  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) {
    return { error: "Você não tem permissão para gerenciar serviços." };
  }
  return { orgId: ownerMembership.organizationId };
}

function collectFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString();
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createServiceAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const auth = await requireOwnerOrgId();
  if ("error" in auth) return { error: auth.error };

  const parsed = createServiceSchema.safeParse(serviceFormDataToInput(formData));
  if (!parsed.success) {
    return {
      error: "Confira os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    await createService(auth.orgId, parsed.data);
  } catch (e) {
    console.error("createService failed:", e);
    return { error: "Não foi possível criar o serviço." };
  }

  revalidatePath("/admin/servicos");
  return { ok: true };
}

export async function updateServiceAction(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const auth = await requireOwnerOrgId();
  if ("error" in auth) return { error: auth.error };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "ID inválido." };

  const input = serviceFormDataToInput(formData) as Record<string, unknown>;
  const parsed = updateServiceSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return {
      error: "Confira os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateService(auth.orgId, parsed.data);
  } catch (e) {
    console.error("updateService failed:", e);
    return { error: "Não foi possível atualizar o serviço." };
  }

  revalidatePath("/admin/servicos");
  return { ok: true };
}

export type DeactivateResult = {
  ok?: boolean;
  deleted?: boolean;
  error?: string;
};

export async function deactivateServiceAction(
  serviceId: string,
): Promise<DeactivateResult> {
  const auth = await requireOwnerOrgId();
  if ("error" in auth) return { error: auth.error };

  try {
    const result = await deactivateOrDeleteService(auth.orgId, serviceId);
    revalidatePath("/admin/servicos");
    return { ok: true, deleted: result.deleted };
  } catch (e) {
    console.error("deactivateService failed:", e);
    return { error: "Não foi possível remover o serviço." };
  }
}

export const initialServiceState = EMPTY;
