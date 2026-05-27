"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { payCommissionAction } from "@/app/admin/comissoes/actions";
import {
  initialCommissionState,
  type CommissionActionState,
} from "@/app/admin/comissoes/state";
import { cn, formatBRL } from "@/lib/utils";
import type { CommissionCalculation } from "@/lib/server/commissions";

type Professional = { id: string; name: string };

type Props = {
  professionals: Professional[];
  selectedProfId?: string;
  periodStart?: string;
  periodEnd?: string;
  calc: CommissionCalculation | null;
  baseUrl: string;
};

export function CommissionCalculator({
  professionals,
  selectedProfId,
  periodStart,
  periodEnd,
  calc,
  baseUrl,
}: Props) {
  const [state, dispatch] = useActionState<CommissionActionState, FormData>(
    payCommissionAction,
    initialCommissionState,
  );

  const defaultStart = periodStart ?? defaultMonthStart();
  const defaultEnd = periodEnd ?? defaultMonthEnd();

  return (
    <div className="space-y-4">
      {/* Filtro */}
      <form
        action={baseUrl}
        method="get"
        className="grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-[1fr_140px_140px_auto]"
      >
        <input type="hidden" name="tab" value="calcular" />
        <div>
          <label className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle">
            Profissional *
          </label>
          <select
            name="professionalId"
            required
            defaultValue={selectedProfId ?? professionals[0]?.id}
            className="h-10 w-full rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle">
            De
          </label>
          <input
            type="date"
            name="periodStart"
            defaultValue={defaultStart}
            required
            className="mono h-10 w-full rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle">
            Até
          </label>
          <input
            type="date"
            name="periodEnd"
            defaultValue={defaultEnd}
            required
            className="mono h-10 w-full rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-ink px-4 text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
          >
            Calcular
          </button>
        </div>
      </form>

      {/* Resultado */}
      {calc && (
        <>
          {calc.items.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-surface-2 p-6 text-center">
              <p className="mb-1 font-display text-base font-bold">
                Sem comissão no período
              </p>
              <p className="mono text-[10px] uppercase tracking-wider text-subtle">
                Nenhuma comanda fechada com serviços de {calc.professionalName}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border border-line bg-surface">
                <div className="border-b border-line bg-surface-2 px-4 py-3">
                  <h3 className="font-display text-sm font-bold">
                    {calc.items.length}{" "}
                    {calc.items.length === 1 ? "item" : "itens"} para{" "}
                    {calc.professionalName}
                  </h3>
                  <p className="mono text-[10px] uppercase tracking-wider text-subtle">
                    Regra padrão: {calc.defaultPercent}% · Período:{" "}
                    {calc.periodStart.toLocaleDateString("pt-BR")} →{" "}
                    {calc.periodEnd.toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="hidden border-b border-line bg-surface-2 px-4 py-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_1fr_120px_60px_120px] md:items-center md:gap-3">
                  <div>Serviço</div>
                  <div>Cliente</div>
                  <div>Bruto</div>
                  <div>%</div>
                  <div>Comissão</div>
                </div>
                <div className="divide-y divide-line">
                  {calc.items.map((i, idx) => (
                    <div
                      key={`${i.comandaId}-${idx}`}
                      className="grid grid-cols-2 gap-2 px-4 py-2 text-sm md:grid-cols-[1fr_1fr_120px_60px_120px] md:items-center md:gap-3"
                    >
                      <div>
                        <div className="font-medium">{i.serviceName}</div>
                        <div className="mono text-[10px] uppercase tracking-wider text-subtle">
                          #{i.comandaShortId}
                        </div>
                      </div>
                      <div className="text-xs text-subtle">{i.customerName}</div>
                      <div className="mono text-xs">{formatBRL(i.grossCents)}</div>
                      <div className="mono text-xs font-semibold text-brand">
                        {i.percent}%
                      </div>
                      <div className="mono text-sm font-semibold">
                        {formatBRL(i.commissionCents)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line bg-surface-2 px-4 py-3 mono grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-subtle">
                      Total bruto
                    </div>
                    <div className="font-display font-bold">
                      {formatBRL(calc.totalGrossCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-subtle">
                      Comissão total
                    </div>
                    <div className="font-display font-bold text-brand">
                      {formatBRL(calc.totalCommissionCents)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagar */}
              <form
                action={dispatch}
                className="rounded-md border border-line bg-surface p-4 space-y-3"
              >
                <input type="hidden" name="professionalId" value={calc.professionalId} />
                <input
                  type="hidden"
                  name="periodStart"
                  value={calc.periodStart.toISOString().slice(0, 10)}
                />
                <input
                  type="hidden"
                  name="periodEnd"
                  value={calc.periodEnd.toISOString().slice(0, 10)}
                />

                {state.error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-2 text-xs text-danger"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}
                {state.ok && (
                  <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/5 p-2 text-xs text-ok">
                    <CheckCircle2 className="h-4 w-4" />
                    Pagamento registrado.
                  </div>
                )}

                <div>
                  <label className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle">
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    maxLength={500}
                    placeholder="Ex: pago via PIX 28/05"
                    className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-brand"
                  />
                </div>

                <PaySubmit total={calc.totalCommissionCents} />
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PaySubmit({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || total === 0}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-ok px-4 text-sm font-semibold text-white shadow-sm transition-all",
        pending || total === 0
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Registrando…
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Registrar pagamento de {formatBRL(total)}
        </>
      )}
    </button>
  );
}

function defaultMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function defaultMonthEnd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
  ).padStart(2, "0")}`;
}
