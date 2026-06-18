"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import {
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/lib/server/billing";
import { isStripeConfigured } from "@/lib/server/stripe";

async function getOwnerCtx(): Promise<
  | { ok: true; organizationId: string; email: string }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sessão expirada." };
  if (!session.user.email) return { ok: false, error: "Email não encontrado." };
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) return { ok: false, error: "Apenas OWNER." };
  return {
    ok: true,
    organizationId: owner.organizationId,
    email: session.user.email,
  };
}

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function flashError(msg: string): never {
  redirect(`/admin/billing?error=${encodeURIComponent(msg)}`);
}

/**
 * Server actions retornam void/Promise<void> pra serem usadas direto em
 * <form action={fn}>. Em sucesso fazem redirect pra URL do Stripe. Em
 * erro, redirect pra /admin/billing?error=... que a page renderiza.
 */
export async function startCheckoutAction(): Promise<void> {
  if (!isStripeConfigured()) {
    flashError("Stripe não configurado no servidor.");
  }
  const ctx = await getOwnerCtx();
  if (!ctx.ok) flashError(ctx.error);

  const base = await getBaseUrl();
  let url: string;
  try {
    const r = await createCheckoutSession({
      organizationId: ctx.organizationId,
      email: ctx.email,
      successUrl: `${base}/admin/billing?checkout=success`,
      cancelUrl: `${base}/admin/billing?checkout=cancel`,
    });
    url = r.url;
  } catch (err) {
    flashError(err instanceof Error ? err.message : "Falha ao criar checkout.");
  }
  redirect(url);
}

export async function openCustomerPortalAction(): Promise<void> {
  if (!isStripeConfigured()) {
    flashError("Stripe não configurado no servidor.");
  }
  const ctx = await getOwnerCtx();
  if (!ctx.ok) flashError(ctx.error);

  const org = await prismaAdmin.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { stripeCustomerId: true },
  });
  if (!org?.stripeCustomerId) {
    flashError("Sem cadastro Stripe ainda. Assine primeiro.");
  }

  const base = await getBaseUrl();
  let url: string;
  try {
    const r = await createCustomerPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${base}/admin/billing`,
    });
    url = r.url;
  } catch (err) {
    flashError(err instanceof Error ? err.message : "Falha ao abrir portal.");
  }
  redirect(url);
}
