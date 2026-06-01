import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listExpenses } from "@/lib/server/expenses";
import { cn, formatBRL } from "@/lib/utils";

import { ExpenseCard } from "./ExpenseCard";
import { ExpenseFormDialog } from "./ExpenseFormDialog";

type SearchParams = {
  month?: string; // YYYY-MM
};

function resolveMonth(sp: SearchParams): { start: Date; end: Date; label: string } {
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
  return `/admin/despesas?month=${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/despesas");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode ver despesas.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const period = resolveMonth(sp);
  const summary = await listExpenses(owner.organizationId, {
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
            Despesas
          </h1>
          <p className="text-sm text-subtle capitalize">{period.label}</p>
        </div>
        <ExpenseFormDialog mode="create" />
      </header>

      <div className="flex items-center gap-2">
        <Link
          href={monthHref(prev.getUTCFullYear(), prev.getUTCMonth())}
          className="tap inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
        >
          ← Anterior
        </Link>
        <Link
          href="/admin/despesas"
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

      {/* Cards de resumo */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Total no mês" value={formatBRL(summary.totalCents)} tone="danger" />
        <Kpi label="Já pago" value={formatBRL(summary.paidCents)} tone="ok" />
        <Kpi label="Pendente" value={formatBRL(summary.unpaidCents)} tone="warn" />
      </section>

      {summary.byCategory.length > 0 && (
        <section className="rounded-md border border-line bg-surface p-4">
          <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Por categoria
          </div>
          <ul className="space-y-1.5">
            {summary.byCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{c.category}</span>
                <span className="mono text-sm font-semibold">
                  {formatBRL(c.amountCents)}
                  <span className="ml-2 text-[10px] text-subtle">
                    ({c.count})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.items.length === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Sem despesas no mês"
          description="Cadastre aluguel, produtos, salários, taxa de cartão pra ter visão real do lucro."
          cta={null}
        />
      ) : (
        <section className="space-y-2">
          <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
            Lançamentos ({summary.items.length})
          </h2>
          {summary.items.map((e) => (
            <ExpenseCard key={e.id} expense={e} />
          ))}
        </section>
      )}

      <p className="text-center text-[11px] text-subtle">
        <Wallet className="inline h-3 w-3" /> Despesas fixas mensais e
        parcelado ficam pra v2.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "ok" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-surface p-4",
        tone === "danger" && "border-danger/30",
        tone === "ok" && "border-ok/30",
        tone === "warn" && "border-warn/30",
      )}
    >
      <div className="mono text-[10px] uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div
        className={cn(
          "num font-display text-2xl font-extrabold",
          tone === "danger" && "text-danger",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </div>
    </div>
  );
}
