import "server-only";

import { prismaAdmin } from "@/lib/db";

import { getStripe, isStripeConfigured } from "./stripe";

/**
 * Estado mínimo da Organization pra decisões de bloqueio. Carregar isso
 * é barato (1 query, 4 campos) — middleware faz a cada request /admin/*.
 */
export type OrgBillingState = {
  organizationId: string;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  // PBI-54: se setado, dono pediu exclusão da conta — bloqueia /admin/*
  // mesmo com billing ativo.
  deletionScheduledFor: Date | null;
};

export async function getOrgBillingState(
  organizationId: string,
): Promise<OrgBillingState | null> {
  const row = await prismaAdmin.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      deletionScheduledFor: true,
    },
  });
  if (!row) return null;
  return {
    organizationId: row.id,
    trialEndsAt: row.trialEndsAt,
    subscriptionStatus: row.subscriptionStatus,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    deletionScheduledFor: row.deletionScheduledFor,
  };
}

/**
 * Org com acesso liberado a /admin/* ? Regras (em ordem de prioridade):
 *  - subscriptionStatus = "active" | "trialing" → sim
 *  - trialEndsAt > now → sim (trial implícito, antes do checkout)
 *  - subscriptionStatus = "past_due" | "canceled" → não
 *  - sem nada (org legada criada via seed) → sim (compat)
 *
 * Em dev sem Stripe (!isStripeConfigured), sempre libera — evita bloquear
 * desenvolvimento. Production deve ter STRIPE_SECRET_KEY.
 */
export function isOrgActive(state: OrgBillingState | null): boolean {
  if (!state) return false;
  // PBI-54: conta marcada pra delete bloqueia tudo (mesmo com Stripe off
  // em dev). Dono cancela a exclusão pra reativar.
  if (state.deletionScheduledFor) return false;
  if (!isStripeConfigured()) return true;

  if (state.subscriptionStatus === "active") return true;
  if (state.subscriptionStatus === "trialing") return true;
  if (
    state.subscriptionStatus === "past_due" ||
    state.subscriptionStatus === "canceled" ||
    state.subscriptionStatus === "incomplete_expired"
  ) {
    return false;
  }
  // Sem subscription Stripe ainda — vale o trial implícito (PBI-49).
  if (state.trialEndsAt && state.trialEndsAt > new Date()) return true;
  // Org legada sem trialEndsAt nem subscription. Libera (não punir
  // contas existentes ao introduzir billing).
  if (!state.trialEndsAt && !state.subscriptionStatus) return true;
  return false;
}

export type BillingDisplay = {
  status:
    | "trial_implicit"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "expired"
    | "no_billing";
  daysLeftInTrial: number | null;
  trialEndsAt: Date | null;
  hasStripeCustomer: boolean;
};

export function describeBilling(state: OrgBillingState): BillingDisplay {
  const now = new Date();
  const hasStripeCustomer = !!state.stripeCustomerId;

  let daysLeft: number | null = null;
  if (state.trialEndsAt) {
    const ms = state.trialEndsAt.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  if (state.subscriptionStatus === "active") {
    return {
      status: "active",
      daysLeftInTrial: null,
      trialEndsAt: state.trialEndsAt,
      hasStripeCustomer,
    };
  }
  if (state.subscriptionStatus === "trialing") {
    return {
      status: "trialing",
      daysLeftInTrial: daysLeft,
      trialEndsAt: state.trialEndsAt,
      hasStripeCustomer,
    };
  }
  if (state.subscriptionStatus === "past_due") {
    return {
      status: "past_due",
      daysLeftInTrial: null,
      trialEndsAt: state.trialEndsAt,
      hasStripeCustomer,
    };
  }
  if (state.subscriptionStatus === "canceled") {
    return {
      status: "canceled",
      daysLeftInTrial: null,
      trialEndsAt: state.trialEndsAt,
      hasStripeCustomer,
    };
  }
  if (state.trialEndsAt && state.trialEndsAt > now) {
    return {
      status: "trial_implicit",
      daysLeftInTrial: daysLeft,
      trialEndsAt: state.trialEndsAt,
      hasStripeCustomer,
    };
  }
  if (state.trialEndsAt && state.trialEndsAt <= now) {
    return {
      status: "expired",
      daysLeftInTrial: 0,
      trialEndsAt: state.trialEndsAt,
      hasStripeCustomer,
    };
  }
  return {
    status: "no_billing",
    daysLeftInTrial: null,
    trialEndsAt: null,
    hasStripeCustomer,
  };
}

/**
 * Cria (ou recupera) Customer Stripe da org e retorna URL do Checkout
 * pra plano único (PRICE_ID via env). Reusa stripeCustomerId se já existir
 * pra não duplicar customers.
 */
export async function createCheckoutSession(input: {
  organizationId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID não configurado. Defina o ID do plano no .env.",
    );
  }

  // Reusa Customer se já existir
  const org = await prismaAdmin.organization.findUnique({
    where: { id: input.organizationId },
    select: { stripeCustomerId: true },
  });

  let customerId = org?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.email,
      metadata: { organizationId: input.organizationId },
    });
    customerId = customer.id;
    await prismaAdmin.organization.update({
      where: { id: input.organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { organizationId: input.organizationId },
    subscription_data: {
      metadata: { organizationId: input.organizationId },
    },
  });

  if (!session.url) {
    throw new Error("Stripe não retornou URL do Checkout.");
  }
  return { url: session.url };
}

/** Cria sessão do Customer Portal pra editar plano/cancelar/atualizar cartão. */
export async function createCustomerPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return { url: session.url };
}
