import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Receipt } from "lucide-react";

import { OpenComandaDialog } from "@/components/features/admin/OpenComandaDialog";
import { auth } from "@/lib/auth";
import { listComandas } from "@/lib/server/comandas";
import { listProfessionalsAdmin } from "@/lib/server/professionals";
import { cn, formatBRL } from "@/lib/utils";

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

export default async function ComandasListPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: "OPEN" | "CLOSED" | "ALL" }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/comandas");

  const membership = session.user.memberships[0];
  if (!membership) {
    return (
      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você não pertence a nenhuma organização.
        </p>
      </div>
    );
  }
  const orgId = membership.organizationId;

  const sp = await searchParams;
  const filter = sp.filter ?? "OPEN";

  const [comandas, professionals] = await Promise.all([
    listComandas(orgId, filter),
    listProfessionalsAdmin(orgId),
  ]);

  const openCount = comandas.filter((c) => c.status === "OPEN").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">PDV</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Comandas
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{comandas.length}</span>{" "}
            {filter === "OPEN" ? "abertas" : filter === "CLOSED" ? "fechadas" : "no total"}
          </p>
        </div>
        <OpenComandaDialog professionals={professionals} />
      </header>

      <div className="flex gap-2 rounded-lg border border-line bg-surface-2 p-1 w-fit">
        <FilterTab href="/admin/comandas?filter=OPEN" active={filter === "OPEN"}>
          Abertas
        </FilterTab>
        <FilterTab href="/admin/comandas?filter=CLOSED" active={filter === "CLOSED"}>
          Fechadas
        </FilterTab>
        <FilterTab href="/admin/comandas?filter=ALL" active={filter === "ALL"}>
          Todas
        </FilterTab>
      </div>

      {comandas.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
          <Receipt className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="mb-2 font-display text-base font-bold">
            {filter === "OPEN" ? "Nenhuma comanda aberta" : "Nada por aqui"}
          </p>
          <p className="text-xs text-subtle">
            {filter === "OPEN"
              ? "Clique em Abrir comanda pra criar a primeira."
              : "Comandas aparecerão aqui após criadas."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_1fr_120px_140px_100px] md:items-center md:gap-4">
            <div>Cliente</div>
            <div>Profissional</div>
            <div>Itens</div>
            <div>Total</div>
            <div className="text-right">Status</div>
          </div>
          <div className="divide-y divide-line">
            {comandas.map((c) => (
              <Link
                key={c.id}
                href={`/admin/comandas/${c.id}`}
                className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-surface-2 md:grid md:grid-cols-[1fr_1fr_120px_140px_100px] md:items-center md:gap-4"
              >
                <div className="flex items-center justify-between gap-2 md:block">
                  <span className="truncate text-sm font-semibold">{c.customerName}</span>
                  <span className="mono text-[10px] uppercase tracking-wider text-subtle md:hidden">
                    {c.openedAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <span className="mono text-xs text-subtle">{c.professionalName}</span>
                <span className="mono text-xs">
                  {c.itemsCount} {c.itemsCount === 1 ? "item" : "itens"}
                </span>
                <div className="mono text-sm font-semibold">
                  {formatBRL(c.totalCents)}
                  {c.status === "OPEN" && c.paidCents > 0 && (
                    <div className="text-[10px] font-normal text-subtle">
                      pago: {formatBRL(c.paidCents)}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center justify-end gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold md:justify-self-end",
                    STATUS_TONE[c.status],
                  )}
                >
                  {STATUS_LABEL[c.status]}
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {filter !== "OPEN" && openCount > 0 && (
        <p className="mono text-[11px] text-subtle text-center">
          Você tem {openCount} comanda{openCount !== 1 && "s"} aberta{openCount !== 1 && "s"}.{" "}
          <Link href="/admin/comandas?filter=OPEN" className="underline">
            Ver
          </Link>
        </p>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-surface text-ink shadow-sm" : "text-subtle hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
