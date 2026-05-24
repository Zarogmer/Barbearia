"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";

import { auth } from "@/lib/auth";
import {
  createProfessional,
  createTimeBlock,
  deactivateOrDeleteProfessional,
  deleteTimeBlock,
  setWorkingHours,
  updateProfessional,
} from "@/lib/server/professionals";
import { withTenant } from "@/lib/db";
import {
  createProfessionalSchema,
  professionalFormDataToInput,
  timeBlockSchema,
  updateProfessionalSchema,
  workingHoursArraySchema,
  type WorkingHoursWindow,
} from "@/lib/validators/professional";

import type {
  ProfessionalActionState,
  TimeBlockActionState,
  WorkingHoursActionState,
} from "./state";

async function requireOwnerOrgId(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada. Faça login novamente." };
  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) return { error: "Você não tem permissão." };
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

// ─── Profissional ─────────────────────────────────────────────

export async function createProfessionalAction(
  _prev: ProfessionalActionState,
  formData: FormData,
): Promise<ProfessionalActionState> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = createProfessionalSchema.safeParse(professionalFormDataToInput(formData));
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  let createdId: string;
  try {
    const result = await createProfessional(ctx.orgId, parsed.data);
    createdId = result.id;
  } catch (e) {
    console.error("createProfessional failed:", e);
    return { error: "Não foi possível criar o profissional." };
  }

  revalidatePath("/admin/profissionais");
  return { ok: true, createdId };
}

export async function updateProfessionalAction(
  _prev: ProfessionalActionState,
  formData: FormData,
): Promise<ProfessionalActionState> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "ID inválido." };

  const input = professionalFormDataToInput(formData) as Record<string, unknown>;
  const parsed = updateProfessionalSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateProfessional(ctx.orgId, parsed.data);
  } catch (e) {
    console.error("updateProfessional failed:", e);
    return { error: "Não foi possível atualizar." };
  }

  revalidatePath("/admin/profissionais");
  revalidatePath(`/admin/profissionais/${id}`);
  return { ok: true };
}

export type DeactivateProfessionalResult = {
  ok?: boolean;
  deleted?: boolean;
  futureAppointmentsCount?: number;
  error?: string;
};

export async function deactivateProfessionalAction(
  professionalId: string,
): Promise<DeactivateProfessionalResult> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  try {
    const result = await deactivateOrDeleteProfessional(ctx.orgId, professionalId);
    revalidatePath("/admin/profissionais");
    if (result.deleted) {
      // Hard delete: redireciona pra lista se chamado da page de detalhe.
      // (Server Action retorna; caller decide se redireciona)
      return { ok: true, deleted: true };
    }
    return {
      ok: true,
      deleted: false,
      futureAppointmentsCount: result.futureAppointmentsCount,
    };
  } catch (e) {
    console.error("deactivateProfessional failed:", e);
    return { error: "Não foi possível remover." };
  }
}

// ─── WorkingHours ─────────────────────────────────────────────

/**
 * Recebe FormData com campos `windows[i][weekday]`, `windows[i][startMinute]`,
 * `windows[i][endMinute]`. Reconstrói o array e valida.
 */
function parseWorkingHoursFromFormData(formData: FormData): unknown {
  const windows: Array<Record<string, unknown>> = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^windows\[(\d+)\]\[(\w+)\]$/);
    if (!m) continue;
    const idx = Number(m[1]);
    const field = m[2]!;
    if (!windows[idx]) windows[idx] = {};
    if (field === "weekday") {
      windows[idx][field] = value;
    } else {
      windows[idx][field] = Number(value);
    }
  }
  // Remove gaps (deletados via UI ainda podem vir com idx pulado)
  return windows.filter(Boolean);
}

export async function setWorkingHoursAction(
  professionalId: string,
  _prev: WorkingHoursActionState,
  formData: FormData,
): Promise<WorkingHoursActionState> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  const raw = parseWorkingHoursFromFormData(formData);
  const parsed = workingHoursArraySchema.safeParse(raw);
  if (!parsed.success) {
    // fieldErrors aqui usa path "windows.{idx}.field" — UI exibe próximo da faixa.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Confira as faixas destacadas.", fieldErrors };
  }

  try {
    await setWorkingHours(ctx.orgId, professionalId, parsed.data as WorkingHoursWindow[]);
  } catch (e) {
    console.error("setWorkingHours failed:", e);
    return { error: "Não foi possível salvar os horários." };
  }

  revalidatePath(`/admin/profissionais/${professionalId}`);
  return { ok: true };
}

// ─── TimeBlock ────────────────────────────────────────────────

export async function createTimeBlockAction(
  professionalId: string,
  _prev: TimeBlockActionState,
  formData: FormData,
): Promise<TimeBlockActionState> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  // Inputs do form: date (YYYY-MM-DD) + startTime/endTime (HH:MM) local da org.
  const date = formData.get("date");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  if (typeof date !== "string" || typeof startTime !== "string" || typeof endTime !== "string") {
    return { error: "Campos obrigatórios faltando." };
  }

  // Pega timezone da org pra montar UTC corretamente.
  const orgTz = await withTenant(ctx.orgId, async (db) =>
    db.organization
      .findUniqueOrThrow({
        where: { id: ctx.orgId },
        select: { timezone: true },
      })
      .then((o) => o.timezone),
  );

  let startsAt: Date;
  let endsAt: Date;
  try {
    startsAt = fromZonedTime(`${date}T${startTime}:00`, orgTz);
    endsAt = fromZonedTime(`${date}T${endTime}:00`, orgTz);
  } catch {
    return { error: "Data ou horário inválido." };
  }

  const parsed = timeBlockSchema.safeParse({
    professionalId,
    startsAt,
    endsAt,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    const result = await createTimeBlock(ctx.orgId, parsed.data);
    if ("code" in result && result.code === "CONFLICT") {
      return {
        error: `Conflito com ${result.appointmentIds.length} agendamento(s) confirmado(s). Cancele primeiro.`,
        conflictAppointmentIds: result.appointmentIds,
      };
    }
  } catch (e) {
    console.error("createTimeBlock failed:", e);
    return { error: "Não foi possível criar o bloqueio." };
  }

  revalidatePath(`/admin/profissionais/${professionalId}`);
  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function deleteTimeBlockAction(
  professionalId: string,
  timeBlockId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireOwnerOrgId();
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deleteTimeBlock(ctx.orgId, timeBlockId);
  } catch (e) {
    console.error("deleteTimeBlock failed:", e);
    return { error: "Não foi possível remover o bloqueio." };
  }

  revalidatePath(`/admin/profissionais/${professionalId}`);
  revalidatePath("/admin/agenda");
  return { ok: true };
}

/**
 * Atalho usado pelo botão "Excluir" na page de detalhe — devolve redirect
 * se hard delete (profissional removido), senão refresh da própria page.
 */
export async function deactivateAndRedirectAction(
  professionalId: string,
): Promise<void> {
  const result = await deactivateProfessionalAction(professionalId);
  if (result.deleted) {
    redirect("/admin/profissionais");
  }
}
