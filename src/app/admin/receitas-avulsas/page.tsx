import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listMiscRevenues } from "@/lib/server/misc-revenues";
import { formatBRL } from "@/lib/utils";

import { MiscRevenueCard } from "./MiscRevenueCard";
import { MiscRevenueFormDialog } from "./MiscRevenueFormDialog";

type SearchParams = { month?: string };

const METHOD_LABEL = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  CORTESIA: "Cortesia",
  "—": "Sem método",
} as const;

function resolveMonth(sp: SearchParams) {
  let year: number, monthIdx: number;
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    year = y!;
    monthIdx = m! - 1;
  } else {
    const now = new Date();
    year = now.getUTCFullYear();
    monthIdx = now.getUTCMonth();
  }
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1));
  return {
    start,
    end,
    label: start.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

function monthHref(year: number, month: number): string {
  return `/admin/receitas-avulsas?month=${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function MiscRevenuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/receitas-avulsas");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const period = resolveMonth(sp);
  const summary = await listMiscRevenues(owner.organizationId, {
    start: period.start,
    end: period.end,
  });

  const cur = new Date(period.start);
  const prev = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <Link
        href="/admin/relatorios"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para relatórios
      </Link>

      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Finanças</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight capitalize md:text-3xl">
            Receitas avulsas
          </h1>
          <p className="text-sm text-subtle capitalize">{period.label}</p>
        </div>
        <MiscRevenueFormDialog mode="create" />
      </header>

      <div className="flex items-center gap-2">
        <Link
          href={monthHref(prev.getUTCFullYear(), prev.getUTCMonth())}
          className="tap inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
        >
          ← Anterior
        </Link>
        <Link
          href="/admin/receitas-avulsas"
          className="tap inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
        >
          Mês atual
        </Link>
        <Link
          href={monthHref(next.getUTCFullYear(), next.getUTCMonth())}
          className="tap inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
        >
          Próximo →
        </Link>
      </div>

      <section className="rounded-md border border-ok/30 bg-ok/5 p-5">
        <div className="mono text-[10px] uppercase tracking-wider text-subtle">
          Total avulso no mês
        </div>
        <div className="num font-display text-3xl font-extrabold text-ok">
          {formatBRL(summary.totalCents)}
        </div>
        <p className="mt-1 text-xs text-subtle">
          Vendas / dicas / outras receitas fora de comanda fechada
        </p>
      </section>

      {summary.byMethod.length > 0 && (
        <section className="rounded-md border border-line bg-surface p-4">
          <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Por forma de pagamento
          </div>
          <ul className="space-y-1.5">
            {summary.byMethod.map((m) => (
              <li key={m.method} className="flex items-center justify-between gap-2">
                <span className="text-sm">{METHOD_LABEL[m.method]}</span>
                <span className="mono text-sm font-semibold">
                  {formatBRL(m.amountCents)}
                  <span className="ml-2 text-[10px] text-subtle">({m.count})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.items.length === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Sem lançamentos no mês"
          description="Registre vendas avulsas (produto sem comanda, dica recebida, etc) pra contar como receita no relatório."
          cta={null}
        />
      ) : (
        <section className="space-y-2">
          <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
            Lançamentos ({summary.items.length})
          </h2>
          {summary.items.map((e) => (
            <MiscRevenueCard key={e.id} revenue={e} />
          ))}
        </section>
      )}

      <p className="text-center text-[11px] text-subtle">
        <TrendingUp className="inline h-3 w-3" /> Receita avulsa entra no
        relatório financeiro junto com comandas fechadas.
      </p>
    </div>
  );
}
