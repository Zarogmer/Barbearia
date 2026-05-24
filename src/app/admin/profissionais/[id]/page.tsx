import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Calendar, Pencil } from "lucide-react";

import { ProfessionalFormDialog } from "@/components/features/admin/ProfessionalFormDialog";
import { TimeBlockManager } from "@/components/features/admin/TimeBlockManager";
import { WorkingHoursEditor } from "@/components/features/admin/WorkingHoursEditor";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import {
  getProfessionalDetail,
  listActiveServicesForProfessionalEditor,
  listFutureTimeBlocks,
} from "@/lib/server/professionals";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/login?next=/admin/profissionais/${id}`);

  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para gerenciar profissionais.
        </p>
      </div>
    );
  }
  const orgId = ownerMembership.organizationId;

  const [prof, services, blocks, orgTz] = await Promise.all([
    getProfessionalDetail(orgId, id),
    listActiveServicesForProfessionalEditor(orgId),
    listFutureTimeBlocks(orgId, id),
    withTenant(orgId, (db) =>
      db.organization
        .findUniqueOrThrow({
          where: { id: orgId },
          select: { timezone: true },
        })
        .then((o) => o.timezone),
    ),
  ]);

  if (!prof) notFound();

  const initials = prof.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <Link
          href="/admin/profissionais"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para lista
        </Link>
      </div>

      {/* Cabeçalho do profissional */}
      <header className="flex flex-col items-start justify-between gap-4 rounded-md border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="avatar-ring">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-base font-bold">
              {initials}
            </span>
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">
              {prof.name}
            </h1>
            <p className="mono text-[11px] uppercase tracking-wider text-subtle">
              {prof.serviceIds.length} serviço{prof.serviceIds.length !== 1 && "s"} ·{" "}
              {prof.upcomingAppointmentsCount} agendamento
              {prof.upcomingAppointmentsCount !== 1 && "s"} futuro
              {prof.upcomingAppointmentsCount !== 1 && "s"}
            </p>
            {prof.bio && (
              <p className="mt-1 max-w-md text-xs text-subtle">{prof.bio}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              prof.active
                ? "rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok"
                : "rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-subtle"
            }
          >
            {prof.active ? "Ativo" : "Inativo"}
          </span>
          <ProfessionalFormDialog
            mode="edit"
            services={services}
            defaults={{
              id: prof.id,
              name: prof.name,
              bio: prof.bio,
              photoUrl: prof.photoUrl,
              active: prof.active,
              serviceIds: prof.serviceIds,
            }}
            trigger={
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:bg-surface-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar dados
              </button>
            }
          />
        </div>
      </header>

      {/* Aviso: inativo com appointments futuros */}
      {!prof.active && prof.upcomingAppointmentsCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Profissional inativo mas tem {prof.upcomingAppointmentsCount} agendamento(s)
            confirmado(s) no futuro. Eles não foram cancelados automaticamente — decida
            individualmente em <Link href="/admin/agenda" className="underline">/admin/agenda</Link>.
          </span>
        </div>
      )}

      {/* Horários de trabalho */}
      <section className="space-y-3 rounded-md border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="inline-flex items-center gap-1.5 font-display text-sm font-bold">
              <Calendar className="h-4 w-4 text-brand" />
              Horários de trabalho
            </h2>
            <p className="mono text-[10px] uppercase tracking-wider text-subtle">
              Por dia da semana, múltiplas faixas
            </p>
          </div>
        </div>
        <WorkingHoursEditor
          professionalId={prof.id}
          initialWindows={prof.workingHours}
        />
      </section>

      {/* Bloqueios */}
      <section className="rounded-md border border-line bg-surface p-5">
        <TimeBlockManager
          professionalId={prof.id}
          blocks={blocks}
          timezone={orgTz}
        />
      </section>
    </div>
  );
}
