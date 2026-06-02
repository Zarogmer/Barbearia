"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Send, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

import { ChatsPanel, type ChatPreview } from "./ChatsPanel";
import { ConnectionPanel, type ConnectionStatusJson } from "./ConnectionPanel";
import { SendMessagePanel } from "./SendMessagePanel";

type Template = {
  id: string;
  title: string;
  body: string;
  key: string | null;
};

type Props = {
  activeTab: string;
  initialStatus: ConnectionStatusJson;
  initialChats: ChatPreview[];
  templates: Template[];
  orgName: string;
  orgAddress: string | null;
};

const TABS = [
  { id: "conexao", label: "Conexão", Icon: Smartphone },
  { id: "conversas", label: "Conversas", Icon: Inbox },
  { id: "enviar", label: "Enviar", Icon: Send },
] as const;

export function WhatsAppDashboard({
  activeTab,
  initialStatus,
  initialChats,
  templates,
  orgName,
  orgAddress,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatusJson>(initialStatus);

  function hrefForTab(tab: string): string {
    const p = new URLSearchParams(searchParams);
    p.set("tab", tab);
    return `/admin/whatsapp?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">CRM</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            WhatsApp
          </h1>
          <p className="text-sm text-subtle">
            {status.state === "open" ? (
              <>
                Conectado como{" "}
                <span className="mono text-ink">
                  {status.ownerName ?? status.ownerNumber ?? "—"}
                </span>
              </>
            ) : status.state === "connecting" ? (
              <>Aguardando QR code...</>
            ) : status.state === "close" ? (
              <>Desconectado. Escaneie o QR pra reconectar.</>
            ) : (
              <>Verificando conexão...</>
            )}
          </p>
        </div>
        <StatusBadge state={status.state} />
      </header>

      <nav
        aria-label="Abas WhatsApp"
        className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface-2 p-1"
      >
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <Link
              key={t.id}
              href={hrefForTab(t.id)}
              scroll={false}
              className={cn(
                "tap inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors",
                active
                  ? "bg-surface text-ink shadow-sm"
                  : "text-subtle hover:text-ink",
              )}
            >
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "conexao" && (
        <ConnectionPanel
          initialStatus={status}
          onStatusChange={setStatus}
          onAfterAction={() => router.refresh()}
        />
      )}

      {activeTab === "conversas" && (
        <ChatsPanel
          initialChats={initialChats}
          connected={status.state === "open"}
        />
      )}

      {activeTab === "enviar" && (
        <SendMessagePanel
          templates={templates}
          orgName={orgName}
          orgAddress={orgAddress}
          connected={status.state === "open"}
        />
      )}
    </div>
  );
}

function StatusBadge({ state }: { state: ConnectionStatusJson["state"] }) {
  const tone =
    state === "open"
      ? "bg-ok/15 text-ok"
      : state === "connecting"
        ? "bg-warn/15 text-warn"
        : "bg-danger/15 text-danger";
  const label =
    state === "open"
      ? "Online"
      : state === "connecting"
        ? "Conectando"
        : state === "close"
          ? "Offline"
          : "—";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 mono text-[11px] font-bold uppercase tracking-wider",
        tone,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          state === "open" && "bg-ok",
          state === "connecting" && "bg-warn animate-pulse",
          (state === "close" || state === "unknown") && "bg-danger",
        )}
      />
      {label}
    </span>
  );
}
