"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCcw,
  Smartphone,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  getConnectionStatusAction,
  getQrCodeAction,
  logoutInstanceAction,
  restartInstanceAction,
} from "./actions";

export type ConnectionStatusJson = {
  state: "open" | "connecting" | "close" | "unknown";
  instanceName: string;
  ownerNumber?: string | null;
  ownerName?: string | null;
};

type Props = {
  initialStatus: ConnectionStatusJson;
  onStatusChange: (s: ConnectionStatusJson) => void;
  onAfterAction: () => void;
};

const POLL_MS = 3000;

export function ConnectionPanel({
  initialStatus,
  onStatusChange,
  onAfterAction,
}: Props) {
  const [status, setStatus] = useState<ConnectionStatusJson>(initialStatus);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartPending, startRestart] = useTransition();
  const [logoutPending, startLogout] = useTransition();

  const refreshStatus = useCallback(async () => {
    const r = await getConnectionStatusAction();
    if (r.ok && r.data) {
      setStatus(r.data);
      onStatusChange(r.data);
    }
  }, [onStatusChange]);

  const refreshQr = useCallback(async () => {
    const r = await getQrCodeAction();
    if (r.ok && r.data?.base64) {
      const raw = r.data.base64;
      setQr(raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`);
    } else if (r.ok && !r.data) {
      setQr(null);
    }
  }, []);

  // Polling: quando state != open, atualiza status + QR a cada 3s
  useEffect(() => {
    if (status.state === "open") {
      setQr(null);
      return;
    }
    refreshQr();
    const t = setInterval(() => {
      refreshStatus();
      if (status.state !== "open") refreshQr();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [status.state, refreshQr, refreshStatus]);

  function handleRestart() {
    setError(null);
    startRestart(async () => {
      const r = await restartInstanceAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setQr(null);
      await refreshStatus();
      onAfterAction();
    });
  }

  function handleLogout() {
    if (
      !confirm(
        "Desconectar WhatsApp? Você precisará escanear o QR novamente pra reconectar.",
      )
    )
      return;
    setError(null);
    startLogout(async () => {
      const r = await logoutInstanceAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setQr(null);
      await refreshStatus();
      onAfterAction();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status.state === "open" ? (
        <div className="rounded-md border border-ok/30 bg-ok/5 p-5">
          <div className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ok">
            <Smartphone className="h-4 w-4" />
            Conectado
          </div>
          <ul className="space-y-1.5 text-sm">
            {status.ownerName && (
              <li>
                <span className="text-subtle">Nome do perfil:</span>{" "}
                <span className="font-semibold">{status.ownerName}</span>
              </li>
            )}
            {status.ownerNumber && (
              <li>
                <span className="text-subtle">Número:</span>{" "}
                <span className="mono">+{status.ownerNumber}</span>
              </li>
            )}
            <li>
              <span className="text-subtle">Instância:</span>{" "}
              <span className="mono">{status.instanceName}</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
            <button
              type="button"
              disabled={restartPending}
              onClick={handleRestart}
              className={cn(
                "tap inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand",
                restartPending && "cursor-wait opacity-60",
              )}
            >
              {restartPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCcw className="h-3 w-3" />
              )}
              Reiniciar instância
            </button>
            <button
              type="button"
              disabled={logoutPending}
              onClick={handleLogout}
              className={cn(
                "tap inline-flex h-9 items-center gap-1.5 rounded-md border border-danger/40 bg-danger/5 px-3 text-xs font-semibold text-danger hover:bg-danger/10",
                logoutPending && "cursor-wait opacity-60",
              )}
            >
              {logoutPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3" />
              )}
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-display text-base font-bold">
              <Smartphone className="h-4 w-4 text-warn" />
              {status.state === "connecting"
                ? "Aguardando conexão"
                : "Desconectado"}
            </div>
            <button
              type="button"
              onClick={refreshQr}
              className="tap inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-subtle hover:border-brand hover:text-brand"
            >
              <RefreshCcw className="h-3 w-3" />
              Novo QR
            </button>
          </div>

          {qr ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="QR code do WhatsApp"
                className="h-64 w-64 rounded-md border-2 border-brand bg-white p-2"
              />
              <ol className="space-y-1 text-xs text-subtle">
                <li>
                  1. Abra o WhatsApp no celular → menu → <strong>Aparelhos conectados</strong>
                </li>
                <li>2. Toque em <strong>Conectar um aparelho</strong></li>
                <li>3. Aponte a câmera neste QR</li>
              </ol>
              <p className="mono text-[10px] uppercase tracking-wider text-subtle">
                Atualizando automaticamente a cada {POLL_MS / 1000}s
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-subtle" />
              <p className="text-xs text-subtle">Buscando QR code...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
