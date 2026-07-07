import "server-only";

/**
 * Helpers de leitura da Evolution API alem do simples send.
 *
 * - Status da conexao (open/connecting/close)
 * - QR code base64 pra parear novo dispositivo
 * - Reiniciar/desconectar instancia
 * - Listar conversas + mensagens
 * - Verificar se um numero tem WhatsApp ativo
 *
 * PBI-51: cada chamada exige `instance` (Organization.evolutionInstance).
 * URL/KEY continuam globais (uma Evolution serve todas as orgs).
 */

export type EvolutionBaseConfig = {
  url: string;
  key: string;
};

export type EvolutionUnconfigured = { ok: false; reason: "NOT_CONFIGURED" };
export type EvolutionApiError = {
  ok: false;
  reason: "API_ERROR";
  message: string;
  status?: number;
};
export type EvolutionResult<T> = { ok: true; data: T } | EvolutionUnconfigured | EvolutionApiError;

export function getEvolutionBaseConfig(): EvolutionBaseConfig | null {
  const url = process.env.EVOLUTION_API_URL?.trim();
  const key = process.env.EVOLUTION_API_KEY?.trim();
  if (!url || !key) return null;
  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

/** Fallback global usado por signups e orgs ainda não migradas. */
export function getFallbackInstance(): string | null {
  return process.env.EVOLUTION_INSTANCE?.trim() ?? null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<EvolutionResult<T>> {
  const cfg = getEvolutionBaseConfig();
  if (!cfg) return { ok: false, reason: "NOT_CONFIGURED" };
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      ...init,
      headers: {
        apikey: cfg.key,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        reason: "API_ERROR",
        status: res.status,
        message: text.slice(0, 300),
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      reason: "API_ERROR",
      message: e instanceof Error ? e.message : "fetch falhou",
    };
  }
}

// ──── Status & conexão ────

export type InstanceState = "open" | "connecting" | "close" | "unknown";

export type ConnectionStatus = {
  state: InstanceState;
  instanceName: string;
  ownerNumber?: string | null;
  ownerName?: string | null;
};

export async function getConnectionStatus(
  instance: string,
): Promise<EvolutionResult<ConnectionStatus>> {
  const stateRes = await call<{
    instance: { instanceName: string; state: string };
  }>(`/instance/connectionState/${instance}`);
  if (!stateRes.ok) return stateRes;

  // Tenta puxar info do owner (numero + nome). Endpoint variado por
  // versao da Evolution — silenciosamente ignora erro.
  let ownerNumber: string | null = null;
  let ownerName: string | null = null;
  try {
    const fetchInst = await call<
      Array<{
        name?: string;
        ownerJid?: string;
        profileName?: string;
      }>
    >(`/instance/fetchInstances`);
    if (fetchInst.ok && Array.isArray(fetchInst.data)) {
      const found = fetchInst.data.find((i) => i.name === instance);
      if (found?.ownerJid) {
        ownerNumber = found.ownerJid.replace(/@.*$/, "");
      }
      if (found?.profileName) {
        ownerName = found.profileName;
      }
    }
  } catch {
    // ignora
  }

  const stateRaw = stateRes.data.instance.state.toLowerCase();
  const state: InstanceState =
    stateRaw === "open" || stateRaw === "connecting" || stateRaw === "close"
      ? (stateRaw as InstanceState)
      : "unknown";

  return {
    ok: true,
    data: {
      state,
      instanceName: instance,
      ownerNumber,
      ownerName,
    },
  };
}

export type QrCode = {
  base64: string | null;
  pairingCode: string | null;
};

export async function getQrCode(instance: string): Promise<EvolutionResult<QrCode>> {
  const res = await call<{
    base64?: string;
    code?: string;
    pairingCode?: string;
    qrcode?: { base64?: string; code?: string };
  }>(`/instance/connect/${instance}`);
  if (!res.ok) return res;

  const data = res.data;
  const base64 = data.base64 ?? data.qrcode?.base64 ?? null;
  const pairingCode = data.pairingCode ?? null;
  return {
    ok: true,
    data: { base64, pairingCode },
  };
}

export async function restartInstance(instance: string): Promise<EvolutionResult<true>> {
  const res = await call<unknown>(`/instance/restart/${instance}`, {
    method: "POST",
  });
  if (!res.ok) return res;
  return { ok: true, data: true };
}

export async function logoutInstance(instance: string): Promise<EvolutionResult<true>> {
  const res = await call<unknown>(`/instance/logout/${instance}`, {
    method: "DELETE",
  });
  if (!res.ok) return res;
  return { ok: true, data: true };
}

// ──── Conversas ────

export type ChatRow = {
  remoteJid: string;
  phone: string;
  name: string | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isGroup: boolean;
};

/** Conteúdo Baileys de uma mensagem (texto ou mídia com legenda). */
type EvolutionMessageContent = {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string };
  videoMessage?: { caption?: string };
  audioMessage?: { seconds?: number };
  stickerMessage?: Record<string, unknown>;
  documentMessage?: { fileName?: string; caption?: string };
};

export type MediaType = "image" | "video" | "audio" | "sticker" | "document";

const MEDIA_LABEL: Record<MediaType, string> = {
  image: "📷 Foto",
  video: "🎬 Vídeo",
  audio: "🎵 Áudio",
  sticker: "💟 Figurinha",
  document: "📎 Documento",
};

function detectMedia(
  m: EvolutionMessageContent | undefined,
): { mediaType: MediaType; caption: string | null } | null {
  if (!m) return null;
  if (m.imageMessage) {
    return { mediaType: "image", caption: m.imageMessage.caption ?? null };
  }
  if (m.videoMessage) {
    return { mediaType: "video", caption: m.videoMessage.caption ?? null };
  }
  if (m.audioMessage) return { mediaType: "audio", caption: null };
  if (m.stickerMessage) return { mediaType: "sticker", caption: null };
  if (m.documentMessage) {
    return {
      mediaType: "document",
      caption: m.documentMessage.caption ?? m.documentMessage.fileName ?? null,
    };
  }
  return null;
}

type EvolutionChat = {
  remoteJid?: string;
  id?: string;
  name?: string;
  pushName?: string;
  profilePicUrl?: string | null;
  unreadCount?: number;
  unread?: number;
  lastMessage?: {
    message?: EvolutionMessageContent;
    messageTimestamp?: number | string;
    timestamp?: number | string;
  };
  lastMessageTimestamp?: number | string;
  updatedAt?: string;
};

function extractText(msg: EvolutionChat["lastMessage"]): string | null {
  if (!msg) return null;
  const m = msg.message;
  if (!m) return null;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  const media = detectMedia(m);
  if (media) {
    return media.caption
      ? `${MEDIA_LABEL[media.mediaType]} · ${media.caption}`
      : MEDIA_LABEL[media.mediaType];
  }
  return null;
}

function parseTimestamp(v: unknown): Date | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return null;
  // Timestamp pode vir em segundos ou ms. Heuristica: < ano 2200 em s.
  const ms = n < 10_000_000_000 ? n * 1000 : n;
  return new Date(ms);
}

export async function listChats(instance: string, limit = 50): Promise<EvolutionResult<ChatRow[]>> {
  const res = await call<EvolutionChat[] | { records?: EvolutionChat[] }>(
    `/chat/findChats/${instance}`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (!res.ok) return res;

  const list = Array.isArray(res.data) ? res.data : (res.data.records ?? []);

  const rows: ChatRow[] = list
    .map((c) => {
      const jid = c.remoteJid ?? c.id ?? "";
      if (!jid) return null;
      const isGroup = jid.endsWith("@g.us");
      const phone = jid.replace(/@.*$/, "");
      const tsRaw =
        c.lastMessage?.messageTimestamp ??
        c.lastMessage?.timestamp ??
        c.lastMessageTimestamp ??
        c.updatedAt ??
        null;
      return {
        remoteJid: jid,
        phone,
        name: c.name ?? c.pushName ?? null,
        lastMessageAt: parseTimestamp(tsRaw),
        lastMessagePreview: extractText(c.lastMessage),
        unreadCount: c.unreadCount ?? c.unread ?? 0,
        isGroup,
      } satisfies ChatRow;
    })
    .filter((c): c is ChatRow => c !== null)
    .filter((c) => !c.isGroup) // foca em conversas 1-a-1
    .sort((a, b) => {
      const ta = a.lastMessageAt?.getTime() ?? 0;
      const tb = b.lastMessageAt?.getTime() ?? 0;
      return tb - ta;
    })
    .slice(0, limit);

  return { ok: true, data: rows };
}

// ──── Mensagens de uma conversa ────

export type MessageRow = {
  id: string;
  fromMe: boolean;
  text: string | null;
  mediaType: MediaType | null;
  timestamp: Date | null;
  status: "sent" | "delivered" | "read" | "unknown";
};

type EvolutionMessage = {
  key?: { id?: string; fromMe?: boolean; remoteJid?: string };
  id?: string;
  fromMe?: boolean;
  remoteJid?: string;
  message?: EvolutionMessageContent;
  messageTimestamp?: number | string;
  timestamp?: number | string;
  status?: string | number;
};

export async function listMessages(
  instance: string,
  remoteJid: string,
  limit = 50,
): Promise<EvolutionResult<MessageRow[]>> {
  const res = await call<
    | EvolutionMessage[]
    | { records?: EvolutionMessage[]; messages?: { records?: EvolutionMessage[] } }
  >(`/chat/findMessages/${instance}`, {
    method: "POST",
    body: JSON.stringify({
      where: { key: { remoteJid } },
      page: 1,
      offset: limit,
    }),
  });
  if (!res.ok) return res;

  const raw = res.data;
  let list: EvolutionMessage[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw.records) {
    list = raw.records;
  } else if (raw.messages?.records) {
    list = raw.messages.records;
  } else {
    list = [];
  }

  const rows: MessageRow[] = list
    .map((m) => {
      const id = m.key?.id ?? m.id ?? "";
      if (!id) return null;
      const fromMe = m.key?.fromMe ?? m.fromMe ?? false;
      const ts = parseTimestamp(m.messageTimestamp ?? m.timestamp);
      const media = detectMedia(m.message);
      // Na thread o texto é só o texto/legenda; o rótulo de mídia fica
      // por conta da UI (via mediaType), diferente do preview da lista.
      const text =
        m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? media?.caption ?? null;
      const statusStr = String(m.status ?? "").toLowerCase();
      const status: MessageRow["status"] =
        statusStr.includes("read") || statusStr === "4"
          ? "read"
          : statusStr.includes("deliver") || statusStr === "3"
            ? "delivered"
            : statusStr.includes("sent") || statusStr === "2"
              ? "sent"
              : "unknown";
      return {
        id,
        fromMe,
        text,
        mediaType: media?.mediaType ?? null,
        timestamp: ts,
        status,
      } satisfies MessageRow;
    })
    .filter((m): m is MessageRow => m !== null)
    .sort((a, b) => {
      const ta = a.timestamp?.getTime() ?? 0;
      const tb = b.timestamp?.getTime() ?? 0;
      return ta - tb; // mais antiga primeiro (cronologico)
    });

  return { ok: true, data: rows };
}

// ──── Verifica se numero tem WhatsApp ────

export type NumberCheck = {
  phone: string;
  hasWhatsApp: boolean;
  jid: string | null;
};

export async function checkWhatsAppNumber(
  instance: string,
  phone: string,
): Promise<EvolutionResult<NumberCheck>> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return {
      ok: false,
      reason: "API_ERROR",
      message: "Telefone vazio",
    };
  }

  const res = await call<Array<{ exists?: boolean; jid?: string; number?: string }>>(
    `/chat/whatsappNumbers/${instance}`,
    {
      method: "POST",
      body: JSON.stringify({ numbers: [digits] }),
    },
  );
  if (!res.ok) return res;

  const found = Array.isArray(res.data) ? res.data[0] : null;
  return {
    ok: true,
    data: {
      phone: digits,
      hasWhatsApp: found?.exists === true,
      jid: found?.jid ?? null,
    },
  };
}
