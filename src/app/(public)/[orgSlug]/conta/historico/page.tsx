import { History } from "lucide-react";

/**
 * Placeholder do tab Histórico — PBI-48 Fase 4 implementa de verdade
 * (lista agendamentos abertos + por mês + avaliações).
 */
export default async function HistoricoTab() {
  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Sua conta</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Histórico
        </h1>
      </header>

      <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
        <History className="mx-auto mb-3 h-8 w-8 text-subtle" />
        <p className="mb-2 font-display text-base font-bold">Histórico em breve</p>
        <p className="text-xs text-subtle">
          Aqui aparecerão seus agendamentos em aberto e atendimentos passados.
        </p>
        <p className="mt-4 mono text-[10px] uppercase tracking-wider text-subtle">
          PBI-48 Fase 4
        </p>
      </div>
    </div>
  );
}
