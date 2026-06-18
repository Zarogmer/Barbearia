import "server-only";

import Stripe from "stripe";

/**
 * Cliente Stripe singleton. Lazy — só instancia quando precisar pra não
 * estourar em build se STRIPE_SECRET_KEY não estiver setada (caso típico
 * em dev local sem billing).
 *
 * Em produção, ausência da key é fatal — billing precisa funcionar.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Defina pra usar billing.",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
    typescript: true,
  });
  return _stripe;
}

/** Verifica se billing está pluggado neste ambiente. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Override pra tests com vi.mock. */
export function __setStripeForTest(s: Stripe | null): void {
  _stripe = s;
}
