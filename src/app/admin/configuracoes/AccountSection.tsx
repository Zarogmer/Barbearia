"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Trash2,
  UserCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  cancelAccountDeletionAction,
  exportMyDataAction,
  requestAccountDeletionAction,
} from "./account-action";

type Props = {
  userName: string;
  userEmail: string;
  deletionScheduledFor: string | null;
};

export function AccountSection({
  userName,
  userEmail,
  deletionScheduledFor,
}: Props) {
  const [exportPending, startExport] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [cancelPending, startCancel] = useTransition();
  const [confirmText, setConfirmText] = useState("");
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

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      const r = await requestAccountDeletionAction();
      if (!r.ok) setError(r.error);
      // sucesso: signOut redireciona pra /
    });
  }

  function handleCancel() {
    setError(null);
    startCancel(async () => {
      const r = await cancelAccountDeletionAction();
      if (!r.ok) setError(r.error ?? "Erro");
    });
  }

  const scheduledForDate = deletionScheduledFor
    ? new Date(deletionScheduledFor)
    : null;

  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <header>
        <h2 className="font-display text-lg font-extrabold">Minha conta</h2>
        <p className="mt-1 text-xs text-subtle">
          Exportar seus dados ou excluir a conta — conforme LGPD art. 18.
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
          <p className="mb-3 text-xs text-subtle">
            Sua conta será removida em{" "}
            <strong>{scheduledForDate.toLocaleDateString("pt-BR")}</strong>.
            Cancele se mudar de ideia.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelPending}
            className={cn(
              "tap inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg",
              cancelPending && "cursor-wait opacity-70",
            )}
          >
            {cancelPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Cancelar exclusão
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-line bg-surface-2 p-4">
            <div className="mb-1 flex items-center gap-2 font-semibold text-sm">
              <Download className="h-4 w-4" />
              Exportar meus dados
            </div>
            <p className="mb-3 text-xs text-subtle">
              Baixa um JSON com tudo da sua barbearia: clientes, agendamentos,
              comandas, serviços, profissionais e mais.
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

          <div className="rounded-md border border-danger/30 bg-danger/5 p-4">
            <div className="mb-1 flex items-center gap-2 font-semibold text-sm text-danger">
              <Trash2 className="h-4 w-4" />
              Excluir minha conta
            </div>
            <p className="mb-3 text-xs text-subtle">
              Marca sua conta para exclusão. Há um período de carência de{" "}
              <strong>30 dias</strong> em que você pode reativar; após isso,
              os dados são removidos definitivamente. Durante a carência,
              login fica bloqueado.
            </p>
            <div className="space-y-2">
              <label
                htmlFor="confirm-delete"
                className="block text-xs font-semibold text-subtle"
              >
                Digite <span className="mono">EXCLUIR</span> para confirmar:
              </label>
              <input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="mono h-9 w-full rounded-md border border-line bg-surface px-3 text-xs outline-none focus:border-danger"
              />
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePending || confirmText !== "EXCLUIR"}
                className={cn(
                  "tap inline-flex h-9 items-center gap-1.5 rounded-md bg-danger px-3 text-xs font-semibold text-white shadow-sm transition-all",
                  deletePending || confirmText !== "EXCLUIR"
                    ? "cursor-not-allowed opacity-60"
                    : "hover:-translate-y-px hover:shadow-lg",
                )}
              >
                {deletePending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Excluir conta
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
