export type PollBackoffOptions = {
  /** Intervalo base entre polls (ms). */
  baseMs?: number;
  /** Multiplicador aplicado a cada erro consecutivo. */
  factor?: number;
  /** Teto do intervalo (ms). */
  maxMs?: number;
  /** Erros consecutivos a partir dos quais desiste de pollar. */
  giveUpAfter?: number;
};

export type PollPlan = { action: "wait"; delayMs: number } | { action: "stop" };

/**
 * Decide o próximo passo de um loop de polling dado o número de erros
 * consecutivos: espera com backoff exponencial (base 3s, dobra por erro,
 * teto 30s) ou para de vez após `giveUpAfter` erros. Sucesso no poll deve
 * zerar o contador no chamador, voltando ao intervalo base.
 */
export function nextPollPlan(
  consecutiveErrors: number,
  options: PollBackoffOptions = {},
): PollPlan {
  const { baseMs = 3_000, factor = 2, maxMs = 30_000, giveUpAfter = 5 } = options;
  const errors = Math.max(0, Math.floor(consecutiveErrors));
  if (errors >= giveUpAfter) return { action: "stop" };
  return { action: "wait", delayMs: Math.min(baseMs * factor ** errors, maxMs) };
}
