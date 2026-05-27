"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

import {
  deleteRuleAction,
  upsertRuleAction,
} from "@/app/admin/comissoes/actions";
import {
  initialCommissionState,
  type CommissionActionState,
} from "@/app/admin/comissoes/state";
import { cn } from "@/lib/utils";
import type { CommissionRuleRow } from "@/lib/server/commissions";

type Service = { id: string; name: string };
type Professional = { id: string; name: string };

type Props = {
  rules: CommissionRuleRow[];
  professionals: Professional[];
  services: Service[];
};

export function CommissionRulesEditor({ rules, professionals, services }: Props) {
  const [state, dispatch] = useActionState<CommissionActionState, FormData>(
    upsertRuleAction,
    initialCommissionState,
  );

  // Agrupar rules por professional pra exibir
  const rulesByProf = new Map<string, CommissionRuleRow[]>();
  for (const r of rules) {
    const arr = rulesByProf.get(r.professionalId) ?? [];
    arr.push(r);
    rulesByProf.set(r.professionalId, arr);
  }

  return (
    <div className="space-y-6">
      {/* Form pra adicionar/atualizar regra */}
      <form
        action={dispatch}
        className="rounded-md border border-line bg-surface p-4 space-y-3"
      >
        <h3 className="font-display text-sm font-bold">Adicionar ou atualizar regra</h3>

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
          <div className="rounded-md border border-ok/30 bg-ok/5 p-2 text-xs text-ok">
            Regra salva.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_80px_auto]">
          <div>
            <label className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle">
              Profissional *
            </label>
            <select
              name="professionalId"
              required
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
              Serviço (vazio = padrão)
            </label>
            <select
              name="serviceId"
              className="h-10 w-full rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
            >
              <option value="">— Padrão (todos)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block mono text-[10px] uppercase tracking-wider text-subtle">
              % *
            </label>
            <input
              name="percent"
              type="number"
              min="0"
              max="100"
              required
              defaultValue="50"
              className="mono h-10 w-full rounded-md border border-line bg-surface px-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="sm:flex sm:items-end">
            <SubmitButton />
          </div>
        </div>
        {state.fieldErrors?.percent && (
          <p className="text-[11px] text-danger">{state.fieldErrors.percent}</p>
        )}
      </form>

      {/* Lista agrupada */}
      {rules.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-surface-2 p-4 text-center mono text-[11px] text-subtle">
          Nenhuma regra cadastrada. Adicione pelo menos uma regra padrão por
          profissional pra começar a calcular comissões.
        </p>
      ) : (
        <div className="space-y-3">
          {professionals.map((p) => {
            const profRules = rulesByProf.get(p.id);
            if (!profRules || profRules.length === 0) return null;
            return (
              <div key={p.id} className="rounded-md border border-line bg-surface">
                <div className="border-b border-line bg-surface-2 px-4 py-2">
                  <h4 className="font-display text-sm font-bold">{p.name}</h4>
                </div>
                <ul className="divide-y divide-line">
                  {profRules.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 px-4 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="mono text-sm font-semibold text-brand min-w-[3rem]">
                          {r.percent}%
                        </span>
                        <span className="text-sm">
                          {r.serviceName ?? (
                            <span className="text-subtle italic">
                              Padrão (todos os serviços)
                            </span>
                          )}
                        </span>
                      </div>
                      <DeleteRuleButton ruleId={r.id} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all sm:w-auto",
        pending ? "cursor-wait opacity-75" : "hover:-translate-y-px hover:shadow-md",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Salvar
    </button>
  );
}

function DeleteRuleButton({ ruleId }: { ruleId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handle() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteRuleAction(ruleId);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handle}
      aria-label="Remover regra"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-colors",
        confirm
          ? "bg-danger/10 text-danger"
          : "text-subtle hover:bg-surface-2 hover:text-danger",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3 w-3" />
      )}
      {confirm ? "Confirmar" : "Remover"}
    </button>
  );
}
