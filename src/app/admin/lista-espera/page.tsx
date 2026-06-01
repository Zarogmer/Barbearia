import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listProfessionalsAdmin } from "@/lib/server/professionals";
import { listActiveServices } from "@/lib/server/services-public";
import { listWaitlist } from "@/lib/server/waitlist";

import { WaitlistFormDialog } from "./WaitlistFormDialog";
import { WaitlistCard } from "./WaitlistCard";

export default async function WaitlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/lista-espera");

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

  const [entries, services, professionals] = await Promise.all([
    listWaitlist(membership.organizationId),
    listActiveServices(membership.organizationId),
    listProfessionalsAdmin(membership.organizationId),
  ]);

  const waiting = entries.filter((e) => e.status === "WAITING");
  const notified = entries.filter((e) => e.status === "NOTIFIED");
  const other = entries.filter(
    (e) => e.status === "SCHEDULED" || e.status === "EXPIRED",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">CRM</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Lista de espera
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{waiting.length}</span> aguardando ·{" "}
            <span className="mono">{notified.length}</span> já notificado
            {notified.length !== 1 && "s"}
          </p>
        </div>
        <WaitlistFormDialog services={services} professionals={professionals} />
      </header>

      {services.length === 0 ? (
        <p className="rounded-md border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
          Cadastre pelo menos 1 serviço antes.
        </p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<CustomersIllustration />}
          title="Ninguém na lista"
          description="Adicione clientes que querem horário quando não tem slot livre. Quando alguém cancelar, você pode encaixar."
          cta={null}
        />
      ) : (
        <>
          {waiting.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
                Aguardando ({waiting.length})
              </h2>
              {waiting.map((e) => (
                <WaitlistCard key={e.id} entry={e} />
              ))}
            </section>
          )}

          {notified.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
                Notificados ({notified.length})
              </h2>
              {notified.map((e) => (
                <WaitlistCard key={e.id} entry={e} />
              ))}
            </section>
          )}

          {other.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display text-xs uppercase tracking-wider text-subtle">
                Arquivados ({other.length})
              </h2>
              {other.map((e) => (
                <WaitlistCard key={e.id} entry={e} />
              ))}
            </section>
          )}
        </>
      )}

      <p className="text-center text-[11px] text-subtle">
        <Clock className="inline h-3 w-3" /> Aviso é manual via WhatsApp.
        Trigger automático ao cancelar appointment fica pra v2.
      </p>
    </div>
  );
}
