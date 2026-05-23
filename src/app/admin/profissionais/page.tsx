import { Plus, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getProfessionalsByOrg, getServiceById, ORGS } from "@/lib/mock-data";

export default function ProfessionalsPage() {
  const professionals = getProfessionalsByOrg(ORGS[0]!.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground">
            {professionals.length} profissional{professionals.length !== 1 && "is"} ativo
            {professionals.length !== 1 && "s"}
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Novo profissional
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professionals.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.serviceIds.length} serviço{p.serviceIds.length !== 1 && "s"}
                </div>
              </div>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{p.bio}</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {p.serviceIds.map((sid) => {
                const svc = getServiceById(sid);
                return (
                  <span
                    key={sid}
                    className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {svc?.name}
                  </span>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg border bg-background py-1.5 text-sm hover:bg-accent">
                Editar
              </button>
              <button className="flex-1 rounded-lg border bg-background py-1.5 text-sm hover:bg-accent">
                Horários
              </button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Protótipo · CRUD + editor de horários em PBI-05 (D3).
      </p>
    </div>
  );
}
