"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Download, Loader2, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import { exportMyDataAction } from "./account-action";

type Props = {
  userName: string;
  userEmail: string;
  deletionScheduledFor: string | null;
};

export function AccountSection({ userName, userEmail, deletionScheduledFor }: Props) {
  const [exportPending, startExport] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startExport(async () => {
      const r = await exportMyDataAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const blob = new Blob([r.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const scheduledForDate = deletionScheduledFor ? new Date(deletionScheduledFor) : null;

  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <header>
        <h2 className="font-display text-lg font-extrabold">Minha conta</h2>
        <p className="mt-1 text-xs text-subtle">
          Exportar seus dados — conforme LGPD art. 18 (portabilidade).
        </p>
      </header>

      <div className="rounded-md border border-line bg-surface-2 p-3 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <UserCheck className="h-4 w-4 text-brand" />
          {userName}
        </div>
        <div className="mono mt-1 text-xs text-subtle">{userEmail}</div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {scheduledForDate ? (
        <div className="rounded-md border border-warn/30 bg-warn/5 p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-display font-bold text-warn">
            <AlertCircle className="h-4 w-4" />
            Exclusão agendada
          </div>
          <p className="text-xs text-subtle">
            Sua conta será removida em{" "}
            <strong>{scheduledForDate.toLocaleDateString("pt-BR")}</strong>. Pra cancelar, entre em
            contato com o suporte.
          </p>
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-surface-2 p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Download className="h-4 w-4" />
          Exportar meus dados
        </div>
        <p className="mb-3 text-xs text-subtle">
          Baixa um JSON com tudo da sua barbearia: clientes, agendamentos, comandas, serviços,
          profissionais e mais.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportPending}
          className={cn(
            "tap inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand",
            exportPending && "cursor-wait opacity-70",
          )}
        >
          {exportPending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              Baixar JSON
            </>
          )}
        </button>
      </div>
    </section>
  );
}
