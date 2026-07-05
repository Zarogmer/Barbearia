/**
 * Parte client-safe do domínio de templates de mensagem (PBI-31).
 * Sem "server-only": é importado por client components (dialogs de
 * envio) e pelo módulo server @/lib/server/messages, que re-exporta
 * tudo daqui pra manter a API antiga.
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
