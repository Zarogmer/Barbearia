"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
  Search,
  SendHorizonal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/server/whatsapp-api";

import { listChatsAction, listMessagesAction, sendMessageAction } from "./actions";

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
  mediaType: MediaType | null;
  timestamp: string | null;
  status: "sent" | "delivered" | "read" | "unknown";
};

type Props = {
  initialChats: ChatPreview[];
  connected: boolean;
};

const CHATS_POLL_MS = 20_000;
const THREAD_POLL_MS = 12_000;

const MEDIA_LABEL: Record<MediaType, string> = {
  image: "📷 Foto",
  video: "🎬 Vídeo",
  audio: "🎵 Áudio",
  sticker: "💟 Figurinha",
  document: "📎 Documento",
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

function formatHour(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function sameDay(aIso: string | null, bIso: string | null): boolean {
  if (!aIso || !bIso) return false;
  return new Date(aIso).toDateString() === new Date(bIso).toDateString();
}

/** Rótulo do separador de data na thread (Hoje | Ontem | data por extenso). */
function daySeparatorLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function ChatsPanel({ initialChats, connected }: Props) {
  const [chats, setChats] = useState(initialChats);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, startTransition] = useTransition();
  const threadRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async (remoteJid: string) => {
    const r = await listMessagesAction(remoteJid);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setMessages(
      r.data.map((m) => ({
        id: m.id,
        fromMe: m.fromMe,
        text: m.text,
        mediaType: m.mediaType,
        timestamp: m.timestamp ? m.timestamp.toISOString() : null,
        status: m.status,
      })),
    );
  }, []);

  // Carga inicial da thread + polling enquanto ela está aberta.
  useEffect(() => {
    if (!selected) return;
    setError(null);
    setMessages([]);
    startTransition(() => loadMessages(selected.remoteJid));
    const t = setInterval(() => void loadMessages(selected.remoteJid), THREAD_POLL_MS);
    return () => clearInterval(t);
  }, [selected, loadMessages]);

  // Polling da lista de conversas (novas conversas / previews).
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(async () => {
      const r = await listChatsAction();
      if (r.ok) setChats(r.data);
    }, CHATS_POLL_MS);
    return () => clearInterval(t);
  }, [connected]);

  // Sempre gruda no fim quando chegam mensagens (comportamento WhatsApp).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selected]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    const r = await sendMessageAction(selected.phone, text);
    setSending(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDraft("");
    await loadMessages(selected.remoteJid);
  }

  const filtered = chats.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, ""));
  });

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
        <section className="flex h-[65vh] flex-col overflow-hidden rounded-md border border-line">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="tap inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-subtle hover:bg-surface-3 lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {selected.name ?? `+${selected.phone}`}
              </div>
              {selected.name && (
                <div className="mono truncate text-[10px] text-subtle">+{selected.phone}</div>
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

          {/* Thread com a cara do WhatsApp: cores fixas (não seguem o tema). */}
          <div
            ref={threadRef}
            className="flex-1 space-y-1.5 overflow-y-auto bg-[#efeae2] px-4 py-3"
          >
            {error && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
            )}
            {pending && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#667781]" />
              </div>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#667781]">
                Sem mensagens nessa conversa.
              </p>
            ) : (
              messages.map((m, i) => {
                const showDay =
                  i === 0 || !sameDay(m.timestamp, messages[i - 1]?.timestamp ?? null);
                return (
                  <Fragment key={m.id}>
                    {showDay && m.timestamp && (
                      <div className="flex justify-center py-2">
                        <span className="rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-medium text-[#54656f] shadow-sm">
                          {daySeparatorLabel(m.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-lg px-3 py-1.5 text-[14px] text-[#111b21] shadow-sm",
                          m.fromMe ? "bg-[#d9fdd3]" : "bg-white",
                        )}
                      >
                        {m.mediaType && (
                          <span className="block text-[13px] text-[#54656f]">
                            {MEDIA_LABEL[m.mediaType]}
                          </span>
                        )}
                        {m.text ? (
                          <span className="whitespace-pre-wrap break-words">{m.text}</span>
                        ) : m.mediaType ? null : (
                          <em className="text-[#667781]">(sem texto)</em>
                        )}
                        <span className="ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px] text-[#667781]">
                          {formatHour(m.timestamp)}
                          {m.fromMe && m.status === "read" && (
                            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                          )}
                          {m.fromMe && m.status === "delivered" && (
                            <CheckCheck className="h-3.5 w-3.5" />
                          )}
                          {m.fromMe && m.status === "sent" && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </div>
                    </div>
                  </Fragment>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 border-t border-line bg-surface-2 px-3 py-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend(e);
                }
              }}
              rows={1}
              placeholder="Escreva uma mensagem…"
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:shadow-glow"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="tap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg transition-opacity disabled:opacity-40"
              aria-label="Enviar"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </button>
          </form>
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
          <p className="px-4 py-6 text-center text-xs text-subtle">Nenhuma conversa.</p>
        ) : (
          chats.map((c) => {
            const initials = (c.name ?? c.phone).replace(/\D/g, "").slice(-2).toUpperCase();
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
