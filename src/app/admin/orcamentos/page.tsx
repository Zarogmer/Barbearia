import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import { listQuotes } from "@/lib/server/quotes";
import { listProducts } from "@/lib/server/products";
import { listActiveServices } from "@/lib/server/services-public";

import { QuoteCard } from "./QuoteCard";
import { QuoteFormDialog } from "./QuoteFormDialog";

export default async function QuotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/orcamentos");

  const membership = session.user.memberships[0];
  if (!membership) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Sem organização.
        </p>
      </div>
    );
  }

  const [quotes, services, products, org] = await Promise.all([
    listQuotes(membership.organizationId),
    listActiveServices(membership.organizationId),
    listProducts(membership.organizationId, { activeOnly: true }),
    getOrganizationForAdmin(membership.organizationId),
  ]);

  const grouped = {
    DRAFT: quotes.filter((q) => q.status === "DRAFT"),
    SENT: quotes.filter((q) => q.status === "SENT"),
    ACCEPTED: quotes.filter((q) => q.status === "ACCEPTED"),
    EXPIRED: quotes.filter((q) => q.status === "EXPIRED"),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Vendas</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Orçamentos
          </h1>
          <p className="text-sm text-subtle">
            Para combos grandes (kit casamento, dia da noiva, pacote
            família). Compartilhe via WhatsApp; converta em comanda no
            atendimento.
          </p>
        </div>
        <QuoteFormDialog
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            priceCents: s.priceCents,
          }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            priceCents: p.salePriceCents,
          }))}
        />
      </header>

      {quotes.length === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Nenhum orçamento ainda"
          description="Crie um orçamento pra cliente fechar pacote grande. Compartilhe via WhatsApp, marque como aceito quando confirmar."
          cta={null}
        />
      ) : (
        <>
          {grouped.DRAFT.length > 0 && (
            <QuoteSection title="Rascunhos" quotes={grouped.DRAFT} orgName={org.name} />
          )}
          {grouped.SENT.length > 0 && (
            <QuoteSection title="Enviados" quotes={grouped.SENT} orgName={org.name} />
          )}
          {grouped.ACCEPTED.length > 0 && (
            <QuoteSection title="Aceitos" quotes={grouped.ACCEPTED} orgName={org.name} />
          )}
          {grouped.EXPIRED.length > 0 && (
            <QuoteSection title="Expirados" quotes={grouped.EXPIRED} orgName={org.name} />
          )}
        </>
      )}

      <p className="text-center text-[11px] text-subtle">
        <FileText className="inline h-3 w-3" /> PDF gerado e conversão
        automática em Comanda ficam pra iteração futura.
      </p>
    </div>
  );
}

function QuoteSection({
  title,
  quotes,
  orgName,
}: {
  title: string;
  quotes: Awaited<ReturnType<typeof listQuotes>>;
  orgName: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
        {title} ({quotes.length})
      </h2>
      {quotes.map((q) => (
        <QuoteCard key={q.id} quote={q} orgName={orgName} />
      ))}
    </section>
  );
}
