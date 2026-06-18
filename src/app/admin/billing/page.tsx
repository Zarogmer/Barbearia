import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, CreditCard, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import {
  describeBilling,
  getOrgBillingState,
  type BillingDisplay,
} from "@/lib/server/billing";
import { isStripeConfigured } from "@/lib/server/stripe";

import {
  openCustomerPortalAction,
  startCheckoutAction,
} from "./actions";

type Props = {
  searchParams: Promise<{
    checkout?: string;
    error?: string;
    reason?: string;
  }>;
};

export default async function BillingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/billing");
  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <main className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode gerenciar assinatura.
        </p>
      </main>
    );
  }

  const sp = await searchParams;
  const checkoutFlash = sp.checkout;
  const errorFlash = sp.error;
  const inactiveReason = sp.reason === "inactive";

  const state = await getOrgBillingState(owner.organizationId);
  const display = state ? describeBilling(state) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Conta</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Assinatura
        </h1>
        <p className="text-sm text-subtle">
          Plano Lustro Pro · R$ 49 / mês · agendamentos ilimitados
        </p>
      </header>

      {inactiveReason && (
        <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sua assinatura precisa estar ativa pra acessar o painel. Assine
            ou regularize abaixo.
          </span>
        </div>
      )}
      {errorFlash && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorFlash}</span>
        </div>
      )}
      {checkoutFlash === "success" && (
        <div className="flex items-start gap-2 rounded-md border border-ok/30 bg-ok/5 p-3 text-sm text-ok">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Pagamento confirmado! Sua barbearia já tá ativa. Pode bombar.
          </span>
        </div>
      )}
      {checkoutFlash === "cancel" && (
        <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Checkout cancelado. Sua barbearia segue no trial enquanto durar.
          </span>
        </div>
      )}

      {!isStripeConfigured() && (
        <div className="rounded-md border border-warn/30 bg-warn/5 p-4 text-xs text-warn">
          <div className="mb-1 font-display text-sm font-bold">
            Stripe não configurado neste ambiente
          </div>
          <p>
            Defina STRIPE_SECRET_KEY, STRIPE_PRICE_ID e STRIPE_WEBHOOK_SECRET
            no .env. Em dev o bloqueio fica desativado pra não atrapalhar.
          </p>
        </div>
      )}

      {display && <StatusCard display={display} />}

      <ActionsRow
        display={display}
        stripeConfigured={isStripeConfigured()}
      />
    </main>
  );
}

function StatusCard({ display }: { display: BillingDisplay }) {
  const meta = (() => {
    switch (display.status) {
      case "active":
        return {
          label: "Ativa",
          tone: "ok" as const,
          msg: "Pagamento em dia. Acesso completo ao painel.",
        };
      case "trialing":
        return {
          label: "Trial",
          tone: "brand" as const,
          msg: `Trial ativo${display.daysLeftInTrial != null ? ` — ${display.daysLeftInTrial} dia${display.daysLeftInTrial === 1 ? "" : "s"} restantes` : ""}.`,
        };
      case "trial_implicit":
        return {
          label: "Trial",
          tone: "brand" as const,
          msg: `Você tem ${display.daysLeftInTrial} dia${display.daysLeftInTrial === 1 ? "" : "s"} grátis pra testar. Assine antes pra não perder acesso.`,
        };
      case "past_due":
        return {
          label: "Pagamento pendente",
          tone: "warn" as const,
          msg: "Última cobrança falhou. Atualize o cartão pra liberar.",
        };
      case "canceled":
        return {
          label: "Cancelada",
          tone: "danger" as const,
          msg: "Sua assinatura foi cancelada. Reative pra usar o painel.",
        };
      case "expired":
        return {
          label: "Trial expirou",
          tone: "danger" as const,
          msg: "Seu trial terminou. Assine pra continuar.",
        };
      default:
        return {
          label: "Sem assinatura",
          tone: "subtle" as const,
          msg: "Assine pra usar o painel.",
        };
    }
  })();

  const toneClass =
    meta.tone === "ok"
      ? "border-ok/30 bg-ok/5 text-ok"
      : meta.tone === "brand"
        ? "border-brand/30 bg-brand-soft text-brand"
        : meta.tone === "warn"
          ? "border-warn/30 bg-warn/5 text-warn"
          : meta.tone === "danger"
            ? "border-danger/30 bg-danger/5 text-danger"
            : "border-line bg-surface-2 text-subtle";

  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 font-display text-base font-bold">
        <Sparkles className="h-4 w-4" />
        {meta.label}
      </div>
      <p className="mt-1 text-sm">{meta.msg}</p>
    </div>
  );
}

function ActionsRow({
  display,
  stripeConfigured,
}: {
  display: BillingDisplay | null;
  stripeConfigured: boolean;
}) {
  const needsCheckout =
    !display ||
    display.status === "trial_implicit" ||
    display.status === "expired" ||
    display.status === "canceled" ||
    display.status === "no_billing";
  const hasCustomer = !!display?.hasStripeCustomer;

  return (
    <div className="flex flex-wrap gap-3">
      {needsCheckout && (
        <form action={startCheckoutAction}>
          <button
            type="submit"
            disabled={!stripeConfigured}
            className="tap inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            Assinar Pro · R$ 49/mês
          </button>
        </form>
      )}
      {hasCustomer && (
        <form action={openCustomerPortalAction}>
          <button
            type="submit"
            disabled={!stripeConfigured}
            className="tap inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand"
          >
            Gerenciar assinatura
          </button>
        </form>
      )}
    </div>
  );
}
