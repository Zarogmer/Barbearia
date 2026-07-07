import {
  BotRouter,
  renderTemplate,
  saudacao,
  type BotContext,
  type BotRule,
  type CooldownStore,
} from "@zarogmer/whatsapp";

/**
 * Regras do bot de WhatsApp da barbearia. Módulo PURO (sem Prisma/server-only)
 * pra ser testável isolado — a persistência (cooldown) entra via injeção do
 * CooldownStore em createBot().
 *
 * Estas regras são um PONTO DE PARTIDA — ajuste os textos/palavras-chave por
 * negócio. Fase 2: trocar o fallback por um responder de IA mantém as regras
 * resolvendo o previsível primeiro.
 */

/** Dados que o webhook injeta em cada mensagem. */
export type BotExtra = {
  orgSlug: string;
  orgName: string;
  /** Base pública do app (sem barra final), pra montar o link de agendamento. */
  appUrl: string;
};

function bookingLink(extra: BotExtra): string {
  return `${extra.appUrl}/${extra.orgSlug}/agendar`;
}

export const BOT_RULES: BotRule<BotExtra>[] = [
  // "cancelar" vem ANTES de "agendar": "remarcar"/"desmarcar" contêm o
  // substring "marcar" (keyword de agendar), então precisam casar primeiro.
  {
    id: "cancelar",
    match: ["cancelar", "desmarcar", "remarcar"],
    respond: () => ({
      text: "Sem problema! Pra cancelar ou remarcar, me diga seu nome e o horário que estava agendado que a gente ajusta pra você. 🙌",
    }),
  },
  {
    id: "agendar",
    // keyword match é tolerante a acento/caixa (a lib normaliza).
    match: ["agendar", "agendamento", "marcar", "marcacao", "horario", "agenda", "reservar"],
    respond: (ctx) => ({
      text: renderTemplate(
        "Oi! Pra agendar é rapidinho — é só escolher o melhor horário por aqui: {link} 💈",
        { link: bookingLink(ctx.extra) },
      ),
    }),
  },
];

/** Fallback: nenhuma regra casou. Auto-resposta com saudação + link. */
export const BOT_FALLBACK = Object.assign(
  (ctx: BotContext<BotExtra>) => ({
    text: renderTemplate(
      "Olá, {saudacao}! 👋 Aqui é o atendimento do {nome}. Pra agendar um horário é só usar este link: {link}. Qualquer dúvida, pode mandar por aqui que a gente responde. 😊",
      {
        saudacao: saudacao(),
        nome: ctx.extra.orgName,
        link: bookingLink(ctx.extra),
      },
    ),
  }),
  // Auto-resposta no máx. 1x a cada 4h por número (absorve repetição/spam).
  { id: "autoresposta", cooldownMinutos: 240 },
);

/** Monta o roteador com as regras + fallback e o store de cooldown injetado. */
export function createBot(cooldownStore: CooldownStore): BotRouter<BotExtra> {
  return new BotRouter<BotExtra>({
    rules: BOT_RULES,
    fallback: BOT_FALLBACK,
    cooldownStore,
  });
}
