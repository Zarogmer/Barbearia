import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  getProfessionalsByOrg,
  getProfessionalsForService,
  getServicesByOrg,
  ORGS,
} from "@/lib/mock-data";
import { formatBRL, formatDuration } from "@/lib/utils";

export default function ServicesPage() {
  const org = ORGS[0]!;
  const services = getServicesByOrg(org.id);
  // Lista usada só pra inferir popularidade no mock — primeiro serviço marcado como "popular".
  const totalProfs = getProfessionalsByOrg(org.id).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Catálogo</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Serviços
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{services.length}</span> serviço
            {services.length !== 1 && "s"} ativo
            {services.length !== 1 && "s"}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Novo serviço
        </button>
      </header>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {/* Header */}
        <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle sm:grid sm:grid-cols-[1fr_120px_120px_140px_80px_80px] sm:items-center sm:gap-4">
          <div>Nome</div>
          <div>Duração</div>
          <div>Preço</div>
          <div>Profissionais</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-line">
          {services.map((s, idx) => {
            const profs = getProfessionalsForService(org.id, s.id);
            const showAll = profs.slice(0, 3);
            const overflow = Math.max(0, profs.length - showAll.length);
            const isPopular = idx === 0;
            return (
              <div
                key={s.id}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-surface-2 sm:grid sm:grid-cols-[1fr_120px_120px_140px_80px_80px] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{s.name}</span>
                    {isPopular && (
                      <span className="rounded-full bg-brand-soft px-1.5 mono text-[9px] font-semibold uppercase tracking-wider text-brand">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-subtle">{s.description}</div>
                </div>
                <div className="mono text-sm">{formatDuration(s.durationMinutes)}</div>
                <div className="mono text-sm font-semibold">{formatBRL(s.priceCents)}</div>
                <div className="flex -space-x-2">
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
                  {profs.length === 0 && (
                    <span className="mono text-[10px] text-subtle">
                      0/{totalProfs}
                    </span>
                  )}
                </div>
                <div>
                  <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok">
                    Ativo
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label={`Editar ${s.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-2 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label={`Remover ${s.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mono text-[10px] uppercase tracking-wider text-subtle">
        Protótipo · CRUD funcional em PBI-04 (D3)
      </p>
    </div>
  );
}
