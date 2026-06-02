"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Inbox,
  Loader2,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { listMessagesAction } from "./actions";

export type ChatPreview = {
  remoteJid: string;
  phone: string;
  name: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

type Message = {
  id: string;
  fromMe: boolean;
  text: string | null;
  timestamp: string | null;
  status: "sent" | "delivered" | "read" | "unknown";
};

type Props = {
  initialChats: ChatPreview[];
  connected: boolean;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatFullTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatsPanel({ initialChats, connected }: Props) {
  const [chats] = useState(initialChats);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = chats.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, ""))
    );
  });

  useEffect(() => {
    if (!selected) return;
    setError(null);
    setMessages([]);
    startTransition(async () => {
      const r = await listMessagesAction(selected.remoteJid);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMessages(
        r.data.map((m) => ({
          id: m.id,
          fromMe: m.fromMe,
          text: m.text,
          timestamp: m.timestamp ? m.timestamp.toString() : null,
          status: m.status,
        })),
      );
    });
  }, [selected]);

  if (!connected) {
    return (
      <div className="rounded-md border border-warn/30 bg-warn/5 p-5 text-sm text-warn">
        Conecte o WhatsApp primeiro (aba Conexão) pra ver as conversas.
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-6 text-center">
        <Inbox className="mx-auto mb-2 h-6 w-6 text-subtle" />
        <p className="text-sm text-subtle">
          Nenhuma conversa ainda. As mensagens recebidas/enviadas aparecem aqui.
        </p>
      </div>
    );
  }

  // Mobile: detail page substitui list. Desktop: split view 2 colunas.
  if (selected) {
    return (
      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <ChatList
            chats={filtered}
            query={query}
            onQueryChange={setQuery}
            selectedJid={selected.remoteJid}
            onSelect={setSelected}
          />
        </aside>
        <section className="rounded-md border border-line bg-surface">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="tap lg:hidden inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-subtle hover:bg-surface-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {selected.name ?? `+${selected.phone}`}
              </div>
              {selected.name && (
                <div className="mono truncate text-[10px] text-subtle">
                  +{selected.phone}
                </div>
              )}
            </div>
            <a
              href={`https://web.whatsapp.com/send?phone=${selected.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tap inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-subtle hover:border-ok hover:text-ok"
              title="Abrir no WhatsApp Web"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir
            </a>
          </div>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
            {error && (
              <p className="text-xs text-danger">{error}</p>
            )}
            {pending && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-subtle" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-subtle py-8">
                Sem mensagens nessa conversa.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.fromMe ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      m.fromMe
                        ? "bg-brand text-brand-fg"
                        : "bg-surface-2 text-ink",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {m.text ?? <em className="opacity-60">(sem texto)</em>}
                    </p>
                    <div
                      className={cn(
                        "mt-1 mono text-[9px] uppercase tracking-wider",
                        m.fromMe ? "text-brand-fg/70" : "text-subtle",
                      )}
                    >
                      {formatFullTime(m.timestamp)}
                      {m.fromMe && m.status !== "unknown" && ` · ${m.status}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <ChatList
      chats={filtered}
      query={query}
      onQueryChange={setQuery}
      selectedJid={null}
      onSelect={setSelected}
    />
  );
}

function ChatList({
  chats,
  query,
  onQueryChange,
  selectedJid,
  onSelect,
}: {
  chats: ChatPreview[];
  query: string;
  onQueryChange: (q: string) => void;
  selectedJid: string | null;
  onSelect: (c: ChatPreview) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por nome ou número"
          className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-glow"
        />
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
        {chats.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-subtle">
            Nenhuma conversa.
          </p>
        ) : (
          chats.map((c) => {
            const initials = (c.name ?? c.phone)
              .replace(/\D/g, "")
              .slice(-2)
              .toUpperCase();
            const isSelected = selectedJid === c.remoteJid;
            return (
              <button
                key={c.remoteJid}
                type="button"
                onClick={() => onSelect(c)}
                className={cn(
                  "tap flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2",
                  isSelected && "bg-brand-soft",
                )}
              >
                <span className="avatar-ring shrink-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                    {initials || "?"}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {c.name ?? `+${c.phone}`}
                    </span>
                    <span className="mono shrink-0 text-[10px] text-subtle">
                      {formatRelative(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-subtle">
                      {c.lastMessagePreview ?? <em>(sem texto)</em>}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-fg">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
