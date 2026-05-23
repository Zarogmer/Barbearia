import { Pencil, Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getServicesByOrg, ORGS } from "@/lib/mock-data";
import { formatBRL, formatDuration } from "@/lib/utils";

export default function ServicesPage() {
  const services = getServicesByOrg(ORGS[0]!.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            {services.length} serviço{services.length !== 1 && "s"} ativo
            {services.length !== 1 && "s"}
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Novo serviço
        </button>
      </div>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="hidden border-b bg-muted/30 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_120px_60px_100px] sm:items-center sm:gap-4">
          <div>Nome</div>
          <div>Duração</div>
          <div>Preço</div>
          <div>Ativo</div>
          <div className="text-right">Ações</div>
        </div>
        {/* Rows */}
        <div className="divide-y">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 px-5 py-4 sm:grid sm:grid-cols-[1fr_120px_120px_60px_100px] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{s.name}</div>
                <div className="truncate text-sm text-muted-foreground">{s.description}</div>
              </div>
              <div className="text-sm tabular-nums">{formatDuration(s.durationMinutes)}</div>
              <div className="text-sm font-medium tabular-nums">{formatBRL(s.priceCents)}</div>
              <div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  ✓
                </span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Protótipo · CRUD funcional em PBI-04 (D3).
      </p>
    </div>
  );
}
