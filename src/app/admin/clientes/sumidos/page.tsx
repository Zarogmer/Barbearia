import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, UserX } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listLapsedCustomers } from "@/lib/server/lapsed-customers";

const PRESETS = [30, 60, 90, 180];

function buildWhatsappLink(phone: string | null, name: string, daysSince: number) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(
    `Olá ${name.split(" ")[0]}! Faz uns ${daysSince} dias que não te vemos por aqui. Que tal marcar um horário?`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export default async function LapsedCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/clientes/sumidos");

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
  const requested = Number(sp.dias);
  const days = PRESETS.includes(requested) ? requested : 60;

  const { items, total, thresholdDays } = await listLapsedCustomers(
    membership.organizationId,
    days,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="space-y-1">
        <div className="eyebrow mb-3">CRM proativo</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Sumidos
        </h1>
        <p className="text-sm text-subtle">
          Clientes que não voltam há <span className="mono">{thresholdDays}</span>{" "}
          dias ou mais. Mande um lembrete pra trazer de volta.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((d) => {
          const active = d === days;
          return (
            <Link
              key={d}
              href={`/admin/clientes/sumidos?dias=${d}`}
              className={
                active
                  ? "tap inline-flex h-9 items-center rounded-full bg-brand px-4 text-xs font-bold text-on-brand"
                  : "tap inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-semibold text-subtle transition-colors hover:border-brand hover:text-ink"
              }
            >
              {d} dias
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CustomersIllustration />}
          title="Ninguém sumido por enquanto"
          description={`Nenhum cliente está há ${thresholdDays}+ dias sem voltar. Trabalho de fidelização tá funcionando.`}
          cta={null}
        />
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-md border border-warn/30 bg-warn/5 px-4 py-3 text-sm">
            <UserX className="h-4 w-4 text-warn" />
            <span>
              <span className="font-bold">{total}</span>{" "}
              {total === 1 ? "cliente sumido" : "clientes sumidos"}. Reativar
              custa ~5× menos que conquistar novo.
            </span>
          </div>

          <div className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_120px_120px_120px_120px] md:items-center md:gap-4">
              <div>Cliente</div>
              <div>Última visita</div>
              <div>Total gasto</div>
              <div>Atendimentos</div>
              <div className="text-right">Ação</div>
            </div>
            <div className="divide-y divide-line">
              {items.map((c) => {
                const initials = c.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const whatsLink = buildWhatsappLink(c.phone, c.name, c.daysSince);
                return (
                  <div
                    key={c.userId}
                    className="flex flex-col gap-2 px-5 py-3 md:grid md:grid-cols-[1fr_120px_120px_120px_120px] md:items-center md:gap-4"
                  >
                    <Link
                      href={`/admin/clientes/${c.userId}`}
                      className="flex items-center gap-3 transition-opacity hover:opacity-80"
                    >
                      <span className="avatar-ring">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold">
                          {initials}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {c.name}
                        </span>
                        <span className="block truncate mono text-[11px] text-subtle">
                          {c.phone ?? c.email}
                        </span>
                      </span>
                    </Link>
                    <span className="mono text-xs">
                      <span className="font-bold text-warn">{c.daysSince}d</span>{" "}
                      <span className="text-subtle">
                        ({c.lastVisitAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })})
                      </span>
                    </span>
                    <span className="mono text-xs text-subtle">
                      R$ {(c.totalSpentCents / 100).toFixed(2)}
                    </span>
                    <span className="mono text-xs text-subtle">
                      {c.completedCount}
                    </span>
                    <div className="flex justify-end">
                      {whatsLink ? (
                        <a
                          href={whatsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tap inline-flex h-9 items-center gap-1.5 rounded-md border border-ok/40 bg-ok/10 px-3 text-xs font-bold text-ok transition-colors hover:bg-ok/20"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="mono text-[11px] text-subtle">
                          sem telefone
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
