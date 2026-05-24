import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { getProfessionalsByOrg, getServiceById, ORGS } from "@/lib/mock-data";

export default function ProfessionalsPage() {
  const org = ORGS[0]!;
  const professionals = getProfessionalsByOrg(org.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Equipe</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Profissionais
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{professionals.length}</span> profissional
            {professionals.length !== 1 && "is"} ativo
            {professionals.length !== 1 && "s"}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Novo profissional
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          placeholder="Buscar por nome ou email"
          className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--brand)/0.18)]"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {/* Header */}
        <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_1.4fr_1.6fr_100px_80px] md:items-center md:gap-4">
          <div>Profissional</div>
          <div>Bio</div>
          <div>Serviços</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-line">
          {professionals.map((p) => {
            const initials = p.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-2 md:grid md:grid-cols-[1fr_1.4fr_1.6fr_100px_80px] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="avatar-ring">
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
                </div>
                <p className="line-clamp-2 text-sm text-subtle">{p.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {p.serviceIds.map((sid) => {
                    const svc = getServiceById(sid);
                    if (!svc) return null;
                    return (
                      <span
                        key={sid}
                        className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink"
                      >
                        {svc.name}
                      </span>
                    );
                  })}
                </div>
                <div>
                  <span
                    className={
                      p.active
                        ? "rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok"
                        : "rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-subtle"
                    }
                  >
                    {p.active ? "Ativo" : "Pausado"}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label={`Editar ${p.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-2 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label={`Remover ${p.name}`}
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
        Protótipo · CRUD + editor de horários em PBI-05 (D3)
      </p>
    </div>
  );
}
