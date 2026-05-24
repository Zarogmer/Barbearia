import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";

import {
  EditProfessionalTrigger,
  NewProfessionalTrigger,
  ProfessionalFormDialog,
} from "@/components/features/admin/ProfessionalFormDialog";
import { auth } from "@/lib/auth";
import {
  listActiveServicesForProfessionalEditor,
  listProfessionalsAdmin,
} from "@/lib/server/professionals";

export default async function ProfessionalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/profissionais");

  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Equipe</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Profissionais
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para gerenciar profissionais.
        </div>
      </div>
    );
  }
  const orgId = ownerMembership.organizationId;

  const [professionals, services] = await Promise.all([
    listProfessionalsAdmin(orgId),
    listActiveServicesForProfessionalEditor(orgId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Equipe</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Profissionais
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{professionals.length}</span> cadastrado
            {professionals.length !== 1 && "s"}
          </p>
        </div>
        <ProfessionalFormDialog
          mode="create"
          services={services}
          trigger={<NewProfessionalTrigger />}
        />
      </header>

      {professionals.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="mb-2 font-display text-base font-bold">
            Nenhum profissional cadastrado
          </p>
          <p className="text-xs text-subtle">
            Clique em <span className="font-semibold">+ Novo profissional</span> pra começar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_1.4fr_1.6fr_100px_120px] md:items-center md:gap-4">
            <div>Profissional</div>
            <div>Bio</div>
            <div>Serviços</div>
            <div>Status</div>
            <div className="text-right">Ações</div>
          </div>
          <div className="divide-y divide-line">
            {professionals.map((p) => {
              const initials = p.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const linkedServices = services.filter((s) =>
                p.serviceIds.includes(s.id),
              );
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-2 md:grid md:grid-cols-[1fr_1.4fr_1.6fr_100px_120px] md:items-center md:gap-4"
                >
                  <Link href={`/admin/profissionais/${p.id}`} className="flex items-center gap-3 min-w-0">
                    <span className="avatar-ring shrink-0">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-xs font-bold">
                        {initials}
                      </span>
                    </span>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="mono truncate text-[11px] text-subtle">
                        {p.serviceIds.length} serv. ·{" "}
                        {p.active ? "ativo" : "inativo"}
                      </div>
                    </div>
                  </Link>
                  <p className="line-clamp-2 text-sm text-subtle">{p.bio ?? "—"}</p>
                  <div className="flex flex-wrap gap-1">
                    {linkedServices.length === 0 ? (
                      <span className="mono text-[10px] text-subtle">nenhum</span>
                    ) : (
                      linkedServices.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink"
                        >
                          {s.name}
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    <span
                      className={
                        p.active
                          ? "rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok"
                          : "rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-subtle"
                      }
                    >
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <ProfessionalFormDialog
                      mode="edit"
                      services={services}
                      defaults={{
                        id: p.id,
                        name: p.name,
                        bio: p.bio,
                        photoUrl: p.photoUrl,
                        active: p.active,
                        serviceIds: p.serviceIds,
                      }}
                      trigger={<EditProfessionalTrigger name={p.name} />}
                    />
                    <Link
                      href={`/admin/profissionais/${p.id}`}
                      aria-label={`Detalhes de ${p.name}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      Horários
                      <ArrowRight className="h-3 w-3" />
                    </Link>
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
