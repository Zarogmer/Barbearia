import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { prismaAdmin } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe — único entry point pra mutar Organization.subscriptionStatus.
 *
 * Setup local (dev):
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 *   stripe trigger checkout.session.completed
 *
 * Eventos tratados:
 *  - checkout.session.completed → grava subscriptionId + status inicial
 *  - customer.subscription.updated → reflete status (trialing/active/past_due/canceled)
 *  - customer.subscription.deleted → marca canceled
 *  - invoice.payment_failed → marca past_due (defensivo, subscription.updated normalmente cobre)
 *
 * Assinatura HMAC é verificada via STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe não configurado." },
      { status: 503 },
    );
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Header stripe-signature ausente." },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "assinatura inválida";
    return NextResponse.json(
      { error: `Webhook signature inválida: ${msg}` },
      { status: 400 },
    );
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`[stripe-webhook] event=${event.type} falhou:`, err);
    return NextResponse.json(
      { error: "Falha ao processar evento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.metadata?.organizationId;
      if (!organizationId) {
        console.warn("[stripe-webhook] checkout sem organizationId metadata");
        return;
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) return;

      await prismaAdmin.organization.update({
        where: { id: organizationId },
        data: {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId:
            typeof session.customer === "string"
              ? session.customer
              : (session.customer?.id ?? undefined),
          subscriptionStatus: "active",
        },
      });
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object;
      await updateOrgFromSubscription(sub);
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const orgId = await findOrgIdForSubscription(sub);
      if (!orgId) return;
      await prismaAdmin.organization.update({
        where: { id: orgId },
        data: { subscriptionStatus: "canceled" },
      });
      return;
    }

    case "invoice.payment_failed": {
      // API mais nova: subscription field foi renomeada/movida. Pegamos via
      // metadata da subscription (presente nos line items) ou via customer.
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer?.id ?? null);
      if (!customerId) return;
      const org = await prismaAdmin.organization.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true, subscriptionStatus: true },
      });
      if (!org) return;
      // Só marca past_due se ainda não tá em estado terminal (canceled).
      if (org.subscriptionStatus !== "canceled") {
        await prismaAdmin.organization.update({
          where: { id: org.id },
          data: { subscriptionStatus: "past_due" },
        });
      }
      return;
    }

    default:
      // Ignora silenciosamente eventos não tratados (Stripe dispara muitos).
      return;
  }
}

async function updateOrgFromSubscription(
  sub: Stripe.Subscription,
): Promise<void> {
  const orgId =
    sub.metadata?.organizationId ?? (await findOrgIdForSubscription(sub));
  if (!orgId) {
    console.warn(
      `[stripe-webhook] subscription ${sub.id} sem orgId mapeavel`,
    );
    return;
  }
  await prismaAdmin.organization.update({
    where: { id: orgId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
    },
  });
}

async function findOrgIdForSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const org = await prismaAdmin.organization.findFirst({
    where: { stripeSubscriptionId: sub.id },
    select: { id: true },
  });
  if (org) return org.id;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const orgByCustomer = await prismaAdmin.organization.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return orgByCustomer?.id ?? null;
}
