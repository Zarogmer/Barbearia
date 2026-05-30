import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  User as UserIcon,
} from "lucide-react";

import { AddComandaItemDialog } from "@/components/features/admin/AddComandaItemDialog";
import { AddPaymentDialog } from "@/components/features/admin/AddPaymentDialog";
import {
  CancelComandaButton,
  CloseComandaButton,
  DiscountForm,
  RemoveItemButton,
  RemovePaymentButton,
} from "@/components/features/admin/ComandaActionButtons";
import { auth } from "@/lib/auth";
import { getComandaDetail } from "@/lib/server/comandas";
import { listProducts } from "@/lib/server/products";
import { listActiveServices } from "@/lib/server/services-public";
import { cn, formatBRL } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_TONE = {
  OPEN: "bg-warn/10 text-warn",
  CLOSED: "bg-ok/10 text-ok",
  CANCELLED: "bg-danger/10 text-danger",
} as const;

const STATUS_LABEL = {
  OPEN: "Aberta",
  CLOSED: "Fechada",
  CANCELLED: "Cancelada",
} as const;

const METHOD_LABEL = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  CORTESIA: "Cortesia",
} as const;

export default async function ComandaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/login?next=/admin/comandas/${id}`);

  const membership = session.user.memberships[0];
  if (!membership) {
    return (
      <div className="mx-auto max-w-4xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você não pertence a nenhuma organização.
        </p>
      </div>
    );
  }
  const orgId = membership.organizationId;

  const [comanda, services, products] = await Promise.all([
    getComandaDetail(orgId, id),
    listActiveServices(orgId),
    listProducts(orgId, { activeOnly: true }),
  ]);

  if (!comanda) notFound();

  const isOpen = comanda.status === "OPEN";
  const shortId = comanda.id.slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8">
      <Link
        href="/admin/comandas"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para comandas
      </Link>

      {/* Header */}
      <header className="flex flex-col items-start justify-between gap-4 rounded-md border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Receipt className="h-6 w-6" />
          </span>
          <div>
            <div className="mono text-[10px] uppercase tracking-wider text-subtle">
              #{shortId}
            </div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">
              {comanda.customerName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mono text-[11px] text-subtle">
              <span className="inline-flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {comanda.professionalName}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {comanda.openedAt.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold",
            STATUS_TONE[comanda.status],
          )}
        >
          {STATUS_LABEL[comanda.status]}
        </span>
      </header>

      {/* Itens */}
      <section className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Itens</h2>
          {isOpen && (
            <AddComandaItemDialog
              comandaId={comanda.id}
              services={services.map((s) => ({
                id: s.id,
                name: s.name,
                priceCents: s.priceCents,
              }))}
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                priceCents: p.salePriceCents,
                currentStock: p.currentStock,
              }))}
            />
          )}
        </div>

        {comanda.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-surface-2 p-4 text-center mono text-[11px] text-subtle">
            Sem itens. Adicione serviços do catálogo ou itens livres.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-line">
            <div className="hidden border-b border-line bg-surface-2 px-4 py-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_60px_120px_120px_40px] md:items-center md:gap-3">
              <div>Item</div>
              <div>Qtd</div>
              <div>Unit.</div>
              <div>Subtotal</div>
              <div></div>
            </div>
            <div className="divide-y divide-line">
              {comanda.items.map((i) => (
                <div
                  key={i.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1fr_60px_120px_120px_40px]"
                >
                  <div>
                    <div className="text-sm font-medium">{i.name}</div>
                    <div className="mono text-[10px] uppercase tracking-wider text-subtle">
                      {i.type === "SERVICE" ? "Serviço" : "Item livre"}
                    </div>
                  </div>
                  <div className="hidden mono text-sm md:block">{i.quantity}</div>
                  <div className="hidden mono text-sm md:block">
                    {formatBRL(i.unitPriceCents)}
                  </div>
                  <div className="mono text-sm font-semibold md:font-bold">
                    {formatBRL(i.subtotalCents)}
                  </div>
                  <div className="justify-self-end">
                    {isOpen && (
                      <RemoveItemButton comandaId={comanda.id} itemId={i.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pagamentos */}
      <section className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Pagamentos</h2>
          {isOpen && comanda.totalCents > 0 && (
            <AddPaymentDialog
              comandaId={comanda.id}
              remainingCents={Math.max(0, comanda.remainingCents)}
            />
          )}
        </div>

        {comanda.payments.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-surface-2 p-4 text-center mono text-[11px] text-subtle">
            Nenhum pagamento registrado.
          </p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-md border border-line">
            {comanda.payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-subtle" />
                  <span className="text-sm font-medium">{METHOD_LABEL[p.method]}</span>
                  <span className="mono text-[10px] uppercase tracking-wider text-subtle">
                    {p.paidAt.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-sm font-semibold">
                    {formatBRL(p.amountCents)}
                  </span>
                  {isOpen && (
                    <RemovePaymentButton comandaId={comanda.id} paymentId={p.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Totals + Discount + Close */}
      <section className="rounded-md border border-line bg-surface p-5 space-y-4">
        {isOpen && (
          <DiscountForm
            comandaId={comanda.id}
            currentDiscountCents={comanda.discountCents}
          />
        )}

        <dl className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatBRL(comanda.itemsSubtotalCents)} />
          {comanda.discountCents > 0 && (
            <Row
              label="Desconto"
              value={`- ${formatBRL(comanda.discountCents)}`}
              tone="danger"
            />
          )}
          <div className="my-1 h-px bg-line" />
          <Row
            label="Total"
            value={formatBRL(comanda.totalCents)}
            bold
          />
          <Row label="Pago" value={formatBRL(comanda.paidCents)} tone="ok" />
          <Row
            label="Restante"
            value={formatBRL(Math.max(0, comanda.remainingCents))}
            tone={comanda.remainingCents > 0 ? "warn" : "ok"}
            bold
          />
        </dl>

        {isOpen ? (
          <>
            <CloseComandaButton
              comandaId={comanda.id}
              disabled={
                comanda.items.length === 0 ||
                comanda.remainingCents !== 0
              }
            />
            {comanda.items.length === 0 && (
              <p className="mono text-center text-[10px] uppercase tracking-wider text-subtle">
                Adicione pelo menos 1 item pra fechar
              </p>
            )}
            {comanda.items.length > 0 && comanda.remainingCents !== 0 && (
              <p className="mono text-center text-[10px] uppercase tracking-wider text-warn">
                {comanda.remainingCents > 0
                  ? "Pagamentos faltando"
                  : "Pagamentos excedem o total"}
              </p>
            )}
            <CancelComandaButton comandaId={comanda.id} />
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-md border border-ok/30 bg-ok/5 p-3 text-sm font-semibold text-ok">
            <CheckCircle2 className="h-4 w-4" />
            {comanda.status === "CLOSED"
              ? `Fechada em ${comanda.closedAt?.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Cancelada"}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneCls =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "danger"
          ? "text-danger"
          : "text-ink";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-subtle">{label}</dt>
      <dd
        className={cn(
          "mono",
          bold && "font-display text-base font-extrabold",
          toneCls,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
