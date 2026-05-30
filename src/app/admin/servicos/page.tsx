import { redirect } from "next/navigation";

import { DeactivateServiceButton } from "@/components/features/admin/DeactivateServiceButton";
import {
  EditServiceTrigger,
  NewServiceTrigger,
  ServiceFormDialog,
} from "@/components/features/admin/ServiceFormDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ScissorsIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listProfessionalsForPicker, listServices } from "@/lib/server/services";
import { formatBRL, formatDuration } from "@/lib/utils";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/servicos");

  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Catálogo</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Serviços
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para gerenciar serviços.
        </div>
      </div>
    );
  }
  const orgId = ownerMembership.organizationId;

  const [services, professionals] = await Promise.all([
    listServices(orgId),
    listProfessionalsForPicker(orgId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Catálogo</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Serviços
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{services.length}</span>{" "}
            serviço{services.length !== 1 && "s"} cadastrado
            {services.length !== 1 && "s"}
          </p>
        </div>
        <ServiceFormDialog
          mode="create"
          professionals={professionals}
          trigger={<NewServiceTrigger />}
        />
      </header>

      {services.length === 0 ? (
        <EmptyState
          icon={<ScissorsIllustration />}
          title="Crie seu primeiro serviço"
          description="Defina nome, duração e preço. Clientes só conseguem agendar depois que você cadastra pelo menos um."
          cta={null}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle sm:grid sm:grid-cols-[1fr_120px_120px_140px_80px_80px] sm:items-center sm:gap-4">
            <div>Nome</div>
            <div>Duração</div>
            <div>Preço</div>
            <div>Profissionais</div>
            <div>Status</div>
            <div className="text-right">Ações</div>
          </div>
          <div className="divide-y divide-line">
            {services.map((s) => {
              const linkedProfs = professionals.filter((p) =>
                s.professionalIds.includes(p.id),
              );
              const showAll = linkedProfs.slice(0, 3);
              const overflow = Math.max(0, linkedProfs.length - showAll.length);

              const editDialog = (
                <ServiceFormDialog
                  mode="edit"
                  professionals={professionals}
                  defaults={{
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    durationMinutes: s.durationMinutes,
                    priceCents: s.priceCents,
                    active: s.active,
                    professionalIds: s.professionalIds,
                  }}
                  trigger={<EditServiceTrigger name={s.name} />}
                />
              );
              const deactivateBtn = (
                <DeactivateServiceButton serviceId={s.id} serviceName={s.name} />
              );
              return (
                <div
                  key={s.id}
                  className="px-4 py-3 transition-colors hover:bg-surface-2 sm:grid sm:grid-cols-[1fr_120px_120px_140px_80px_80px] sm:items-center sm:gap-4 sm:px-5 sm:py-4"
                >
                  {/* Mobile: layout denso 2 linhas */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{s.name}</div>
                        {s.description && (
                          <div className="truncate text-[11px] text-subtle">
                            {s.description}
                          </div>
                        )}
                      </div>
                      <div className="mono shrink-0 text-sm font-semibold">
                        {formatBRL(s.priceCents)}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="mono text-[11px] text-subtle">
                          {formatDuration(s.durationMinutes)}
                        </span>
                        {linkedProfs.length > 0 ? (
                          <span className="mono text-[11px] text-subtle">
                            · {linkedProfs.length} prof
                            {linkedProfs.length !== 1 && "s"}
                          </span>
                        ) : (
                          <span className="mono text-[10px] text-warn">
                            · sem prof
                          </span>
                        )}
                        <span
                          className={
                            s.active
                              ? "rounded-full bg-ok/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-ok"
                              : "rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-subtle"
                          }
                        >
                          {s.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {editDialog}
                        {deactivateBtn}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: grid original */}
                  <div className="hidden min-w-0 sm:block">
                    <div className="truncate font-semibold">{s.name}</div>
                    {s.description && (
                      <div className="truncate text-xs text-subtle">{s.description}</div>
                    )}
                  </div>
                  <div className="hidden mono text-sm sm:block">
                    {formatDuration(s.durationMinutes)}
                  </div>
                  <div className="hidden mono text-sm font-semibold sm:block">
                    {formatBRL(s.priceCents)}
                  </div>
                  <div className="hidden -space-x-2 sm:flex">
                    {showAll.map((p) => {
                      const ini = p.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <span key={p.id} className="avatar-ring" title={p.name}>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold">
                            {ini}
                          </span>
                        </span>
                      );
                    })}
                    {overflow > 0 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-[9px] font-bold text-subtle">
                        +{overflow}
                      </span>
                    )}
                    {linkedProfs.length === 0 && (
                      <span className="mono text-[10px] text-subtle">nenhum</span>
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <span
                      className={
                        s.active
                          ? "rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok"
                          : "rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-subtle"
                      }
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="hidden items-center justify-end gap-1 sm:flex">
                    {editDialog}
                    {deactivateBtn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
