import { redirect } from "next/navigation";
import { Package as PackageIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listPackages } from "@/lib/server/packages";
import { listActiveServices } from "@/lib/server/services-public";
import { formatBRL } from "@/lib/utils";

import { PackageCard } from "./PackageCard";
import { PackageFormDialog } from "./PackageFormDialog";

export default async function PackagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/pacotes");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode gerenciar pacotes.
        </p>
      </div>
    );
  }

  const [packages, services] = await Promise.all([
    listPackages(owner.organizationId),
    listActiveServices(owner.organizationId),
  ]);

  const totalSavingsRules = packages
    .filter((p) => p.active)
    .map((p) => p);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">PDV</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Pacotes de sessão
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{totalSavingsRules.length}</span>{" "}
            {totalSavingsRules.length === 1 ? "ativo" : "ativos"}. Cliente
            paga adiantado por N sessões; admin consome ao concluir.
          </p>
        </div>
        <PackageFormDialog mode="create" services={services} />
      </header>

      {services.length === 0 ? (
        <p className="rounded-md border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
          Cadastre pelo menos 1 serviço antes de criar pacotes.
        </p>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={<CustomersIllustration />}
          title="Nenhum pacote cadastrado"
          description="Crie pacotes (ex: 10 cortes por R$ 200) pra incentivar fidelização e receber adiantado."
          cta={null}
        />
      ) : (
        <div className="space-y-3">
          {packages.map((p) => (
            <PackageCard
              key={p.id}
              pkg={{
                id: p.id,
                serviceId: p.serviceId,
                name: p.name,
                sessionsCount: p.sessionsCount,
                priceCents: p.priceCents,
                pricePerSessionLabel: formatBRL(p.pricePerSessionCents),
                priceLabel: formatBRL(p.priceCents),
                expiresInDays: p.expiresInDays,
                active: p.active,
                serviceName: p.serviceName,
              }}
              services={services}
            />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-subtle">
        <PackageIcon className="inline h-3 w-3" /> Pacote vendido vira saldo
        na ficha do cliente. Admin consome 1 sessão por atendimento.
      </p>
    </div>
  );
}
