import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listCustomersAdmin } from "@/lib/server/customers";

const PAGE_SIZE = 20;

export default async function CustomersListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/clientes");

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

  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await listCustomersAdmin(
    membership.organizationId,
    query || undefined,
    page,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Equipe</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Clientes
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{result.total}</span>{" "}
            {result.total === 1 ? "cliente" : "clientes"} já atendido
            {result.total !== 1 && "s"}
          </p>
        </div>
      </header>

      <form className="relative max-w-md" action="/admin/clientes" method="get">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Buscar por nome ou email"
          className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--brand)/0.18)]"
        />
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={<CustomersIllustration />}
          title={query ? "Nenhum cliente encontrado" : "Ainda sem clientes"}
          description={
            query
              ? "Tente outra busca ou limpe o filtro."
              : "Clientes aparecem aqui automaticamente após o primeiro agendamento. Não precisa cadastrar manualmente."
          }
          cta={null}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_1fr_140px_140px_80px] md:items-center md:gap-4">
              <div>Nome</div>
              <div>Email</div>
              <div>Telefone</div>
              <div>Última visita</div>
              <div className="text-right">Atendimentos</div>
            </div>
            <div className="divide-y divide-line">
              {result.items.map((c) => {
                const initials = c.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Link
                    key={c.userId}
                    href={`/admin/clientes/${c.userId}`}
                    className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-surface-2 md:grid md:grid-cols-[1fr_1fr_140px_140px_80px] md:items-center md:gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="avatar-ring">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold">
                          {initials}
                        </span>
                      </span>
                      <span className="truncate text-sm font-semibold">{c.name}</span>
                    </div>
                    <span className="truncate mono text-xs text-subtle">{c.email}</span>
                    <span className="mono text-xs text-subtle">
                      {c.phone ?? "—"}
                    </span>
                    <span className="mono text-xs text-subtle">
                      {c.lastVisitAt
                        ? c.lastVisitAt.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </span>
                    <span className="text-right text-sm font-semibold">
                      {c.appointmentsCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] uppercase tracking-wider text-subtle">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/clientes?${new URLSearchParams({ q: query, page: String(page - 1) })}`}
                    className="h-9 rounded-md border border-line bg-surface px-3 text-xs font-semibold leading-9 transition-colors hover:bg-surface-2"
                  >
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/clientes?${new URLSearchParams({ q: query, page: String(page + 1) })}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:bg-surface-2"
                  >
                    Próxima
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
