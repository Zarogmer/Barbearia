import "server-only";

export interface WhatsAppProvider {
  /**
   * Envia mensagem de texto via WhatsApp. Resolve em sucesso ou rejeita
   * (lanca) em falha. Implementacoes especificas (Evolution API etc.)
   * tratam codigos de erro do provider e re-lancam com mensagem
   * amigavel.
   */
  send(phone: string, body: string): Promise<void>;
}

/**
 * Provider dev/teste: imprime a mensagem no console em vez de enviar.
 * Nunca usado em producao (NODE_ENV === "production" forca Evolution).
 */
class FakeWhatsAppProvider implements WhatsAppProvider {
  async send(phone: string, body: string): Promise<void> {
    console.log(`\n[FakeWhatsApp] -> ${phone}\n   ${body}\n`);
  }
}

/**
 * Provider Evolution API (WhatsApp nao-oficial via Baileys).
 *
 * Setup no Railway:
 *  1. Deploy Evolution API + Redis + Postgres (template oficial).
 *  2. Copiar AUTHENTICATION_API_KEY do service Evolution.
 *  3. Criar instancia:
 *       POST {url}/instance/create
 *       Header: apikey: {key}
 *       Body: { "instanceName": "barbearia", "qrcode": true,
 *               "integration": "WHATSAPP-BAILEYS" }
 *  4. Escanear QR code com o WhatsApp do dono da barbearia.
 *  5. Setar EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
 *     no .env do Barbearia.
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
    private instance: string,
  ) {}

  async send(phone: string, body: string): Promise<void> {
    const number = phone.replace(/\D/g, "");
    if (!number) throw new Error(`Telefone invalido: "${phone}"`);

    const base = this.url.replace(/\/$/, "");
    const endpoint = `${base}/message/sendText/${this.instance}`;
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
  const instance = process.env.EVOLUTION_INSTANCE;
  if (url && key && instance) {
    _provider = new EvolutionWhatsAppProvider(url, key, instance);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "WhatsApp provider nao configurado em producao. Defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE.",
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
