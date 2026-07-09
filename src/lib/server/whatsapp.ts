import "server-only";

export interface WhatsAppProvider {
  /**
   * Envia mensagem de texto via WhatsApp.
   *
   * `instance` define qual sessão Evolution usar. Quando omitido, o provider
   * recorre ao fallback global (EVOLUTION_INSTANCE env var). Esse fallback
   * existe pra signups (que rodam antes da org existir) e pra orgs antigas
   * que ainda não migraram pra instância própria (PBI-51).
   *
   * Resolve em sucesso ou rejeita (lança) em falha.
   */
  send(phone: string, body: string, instance?: string): Promise<void>;
}

/**
 * Provider dev/teste: imprime a mensagem no console em vez de enviar.
 * Nunca usado em producao (NODE_ENV === "production" forca Evolution).
 */
class FakeWhatsAppProvider implements WhatsAppProvider {
  async send(phone: string, body: string, instance?: string): Promise<void> {
    console.log(
      `\n[FakeWhatsApp] -> ${phone}${instance ? ` via instance=${instance}` : ""}\n   ${body}\n`,
    );
  }
}

/**
 * Provider Evolution API (WhatsApp nao-oficial via Baileys).
 *
 * Multi-tenant (PBI-51): cada Organization tem sua própria evolutionInstance.
 * O provider só conhece url+key (compartilhados); a instance vem por chamada.
 *
 * Endpoint usado:
 *   POST {url}/message/sendText/{instance}
 *   Body: { "number": "5511999998888", "text": "..." }
 *
 * Numero precisa ser so digitos com codigo do pais (sem "+"). A
 * conversao de E.164 (+5511999998888 -> 5511999998888) acontece aqui.
 */
class EvolutionWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private url: string,
    private key: string,
    private fallbackInstance: string | null,
  ) {}

  async send(phone: string, body: string, instance?: string): Promise<void> {
    const targetInstance = instance ?? this.fallbackInstance;
    if (!targetInstance) {
      throw new Error(
        "Nenhuma instância WhatsApp configurada. Conecte em /admin/whatsapp.",
      );
    }
    const number = phone.replace(/\D/g, "");
    if (!number) throw new Error(`Telefone invalido: "${phone}"`);

    const base = this.url.replace(/\/$/, "");
    const endpoint = `${base}/message/sendText/${targetInstance}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: this.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number, text: body }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Evolution API falhou (${res.status}): ${text.slice(0, 200)}`,
      );
    }
  }
}

let _provider: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (_provider) return _provider;
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const fallbackInstance = process.env.EVOLUTION_INSTANCE ?? null;
  if (url && key) {
    _provider = new EvolutionWhatsAppProvider(url, key, fallbackInstance);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "WhatsApp provider nao configurado em producao. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY.",
      );
    }
    _provider = new FakeWhatsAppProvider();
  }
  return _provider;
}

/** Sobrescreve o provider (uso em tests com vi.mock). */
export function __setWhatsAppProviderForTest(p: WhatsAppProvider | null): void {
  _provider = p;
}
