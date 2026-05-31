import "server-only";

import { withTenant } from "@/lib/db";

/**
 * Templates de mensagens (PBI-31).
 *
 * Envio é manual via WhatsApp web (link wa.me) — sem integração com
 * WhatsApp Cloud API por enquanto (custo alto + bureaucracia META no
 * MVP). Dono cadastra texto com placeholders, escolhe template no
 * card do cliente e o sistema abre wa.me com mensagem ja preenchida.
 */

export type MessageTemplate = {
  id: string;
  organizationId: string;
  title: string;
  body: string;
  key: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMessageTemplateInput = {
  title: string;
  body: string;
  key?: string | null;
  active?: boolean;
};

export type UpdateMessageTemplateInput = CreateMessageTemplateInput & {
  id: string;
};

/** Variáveis aceitas em placeholders. Reaproveita o domínio existente. */
export type MessageRenderVars = {
  nome?: string;
  data?: string;
  hora?: string;
  servico?: string;
  profissional?: string;
  barbearia?: string;
  endereco?: string;
  whatsapp?: string;
};

export const MESSAGE_PLACEHOLDERS: Array<keyof MessageRenderVars> = [
  "nome",
  "data",
  "hora",
  "servico",
  "profissional",
  "barbearia",
  "endereco",
  "whatsapp",
];

/**
 * Substitui {placeholders} no template. Vars ausentes ficam como
 * "—" (em vez de string vazia) pra ficar visível pro user que faltou
 * dado, mas sem ficar `{nome}` sem renderizar.
 */
export function renderTemplate(body: string, vars: MessageRenderVars): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key as keyof MessageRenderVars];
    return v && v.trim().length > 0 ? v : "—";
  });
}

/**
 * Gera link wa.me com texto ja codificado. Auto-prefix 55 (BR). Telefone
 * pode vir com mascara — sanitiza pra so digitos.
 */
export function buildWhatsAppLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

// ──── CRUD ────

export async function listMessageTemplates(
  organizationId: string,
  opts: { onlyActive?: boolean } = {},
): Promise<MessageTemplate[]> {
  return withTenant(organizationId, async (db) => {
    return db.messageTemplate.findMany({
      where: opts.onlyActive ? { active: true } : undefined,
      orderBy: [{ active: "desc" }, { title: "asc" }],
    });
  });
}

export async function getMessageTemplate(
  organizationId: string,
  id: string,
): Promise<MessageTemplate | null> {
  return withTenant(organizationId, async (db) => {
    return db.messageTemplate.findUnique({ where: { id } });
  });
}

export async function createMessageTemplate(
  organizationId: string,
  input: CreateMessageTemplateInput,
): Promise<MessageTemplate> {
  return withTenant(organizationId, async (db) => {
    return db.messageTemplate.create({
      data: {
        organizationId,
        title: input.title,
        body: input.body,
        key: input.key ?? null,
        active: input.active ?? true,
      },
    });
  });
}

export async function updateMessageTemplate(
  organizationId: string,
  input: UpdateMessageTemplateInput,
): Promise<MessageTemplate> {
  return withTenant(organizationId, async (db) => {
    return db.messageTemplate.update({
      where: { id: input.id },
      data: {
        title: input.title,
        body: input.body,
        key: input.key ?? null,
        active: input.active ?? true,
      },
    });
  });
}

export async function deleteMessageTemplate(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.messageTemplate.delete({ where: { id } });
  });
}

/**
 * Templates default pra seed inicial em novas orgs. Não cria
 * automaticamente — admin pode importar via botão "Carregar exemplos"
 * na tela /admin/mensagens.
 */
export const DEFAULT_TEMPLATES: CreateMessageTemplateInput[] = [
  {
    key: "CONFIRMAR",
    title: "Confirmar agendamento",
    body: "Oi {nome}! Confirmo seu horário na {barbearia} dia {data} às {hora} com {profissional} para {servico}. Posso confirmar?",
  },
  {
    key: "LEMBRETE",
    title: "Lembrete 24h",
    body: "Oi {nome}! Lembrete: você tem horário marcado amanhã ({data} às {hora}) na {barbearia}. Te espero!",
  },
  {
    key: "ANIVERSARIO",
    title: "Parabéns aniversariante",
    body: "Feliz aniversário, {nome}! 🎉 A galera da {barbearia} deseja um ótimo dia. Que tal um corte de presente? Marca aí!",
  },
  {
    key: "SUMIDO",
    title: "Cliente sumido",
    body: "Oi {nome}! Faz tempo que não te vejo por aqui na {barbearia}. Bora marcar um horário pra retornar?",
  },
  {
    key: "ENDERECO",
    title: "Endereço da barbearia",
    body: "Oi {nome}! O endereço da {barbearia} é: {endereco}. Qualquer coisa avisa no WhatsApp.",
  },
];
