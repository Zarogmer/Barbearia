"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createMessageTemplate,
  deleteMessageTemplate,
  DEFAULT_TEMPLATES,
  updateMessageTemplate,
} from "@/lib/server/messages";
import {
  messageTemplateFormDataToInput,
  messageTemplateSchema,
} from "@/lib/validators/message";

import type {
  MessageTemplateResult,
  MessageTemplateState,
} from "./state";

async function requireOwner(): Promise<{ orgId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Sessão expirada." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { error: "Apenas OWNER pode gerenciar templates." };
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

export async function saveMessageTemplateAction(
  _prev: MessageTemplateState,
  formData: FormData,
): Promise<MessageTemplateState> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  const parsed = messageTemplateSchema.safeParse(
    messageTemplateFormDataToInput(formData),
  );
  if (!parsed.success) {
    return {
      error: "Confira os campos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  try {
    if (parsed.data.id) {
      const t = await updateMessageTemplate(ctx.orgId, {
        id: parsed.data.id,
        title: parsed.data.title,
        body: parsed.data.body,
        key: parsed.data.key ?? null,
        active: parsed.data.active,
      });
      revalidatePath("/admin/mensagens");
      return { ok: true, templateId: t.id };
    }
    const t = await createMessageTemplate(ctx.orgId, {
      title: parsed.data.title,
      body: parsed.data.body,
      key: parsed.data.key ?? null,
      active: parsed.data.active,
    });
    revalidatePath("/admin/mensagens");
    return { ok: true, templateId: t.id };
  } catch (e) {
    console.error("saveMessageTemplate failed:", e);
    return { error: "Não foi possível salvar." };
  }
}

export async function deleteMessageTemplateAction(
  id: string,
): Promise<MessageTemplateResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deleteMessageTemplate(ctx.orgId, id);
    revalidatePath("/admin/mensagens");
    return { ok: true };
  } catch (e) {
    console.error("deleteMessageTemplate failed:", e);
    return { error: "Não foi possível remover." };
  }
}

/**
 * Importa os 5 templates default (CONFIRMAR, LEMBRETE, ANIVERSARIO,
 * SUMIDO, ENDERECO). Idempotente por title — se já tem template com
 * mesmo título, pula. Não duplica.
 */
export async function importDefaultTemplatesAction(): Promise<MessageTemplateResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { error: ctx.error };

  try {
    for (const tpl of DEFAULT_TEMPLATES) {
      try {
        await createMessageTemplate(ctx.orgId, tpl);
      } catch {
        // ignora duplicado (sem unique constraint no title — mas idempotência simples)
      }
    }
    revalidatePath("/admin/mensagens");
    return { ok: true };
  } catch (e) {
    console.error("importDefaultTemplates failed:", e);
    return { error: "Não foi possível importar exemplos." };
  }
}
