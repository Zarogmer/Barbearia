import "server-only";

export interface SmsProvider {
  /**
   * Envia SMS. Deve resolver em sucesso ou rejeitar (lancar) em falha.
   * Implementacoes especificas (Twilio etc.) tratam codigos de erro
   * do provider e re-lancam com mensagem amigavel.
   */
  send(phone: string, body: string): Promise<void>;
}

/**
 * Provider dev/teste: imprime o codigo no console em vez de enviar SMS.
 * Nunca usado em producao (NODE_ENV === "production" forca Twilio).
 */
class FakeSmsProvider implements SmsProvider {
  async send(phone: string, body: string): Promise<void> {
    console.log(`\n📱 [FakeSms] → ${phone}\n   ${body}\n`);
  }
}

/**
 * Provider Twilio. Requer TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e
 * TWILIO_FROM no ambiente. Quando o usuario configurar, implementar
 * usando @twilio/sdk ou fetch direto pra https://api.twilio.com/2010-04-01/Accounts/<SID>/Messages.json
 */
class TwilioSmsProvider implements SmsProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
    private from: string,
  ) {}

  async send(phone: string, body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const params = new URLSearchParams({ To: phone, From: this.from, Body: body });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twilio falhou (${res.status}): ${text.slice(0, 200)}`);
    }
  }
}

let _provider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (_provider) return _provider;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (sid && token && from) {
    _provider = new TwilioSmsProvider(sid, token, from);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMS provider nao configurado em producao. Defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM.",
      );
    }
    _provider = new FakeSmsProvider();
  }
  return _provider;
}

/** Sobrescreve o provider (uso em tests com vi.mock). */
export function __setSmsProviderForTest(p: SmsProvider | null): void {
  _provider = p;
}
