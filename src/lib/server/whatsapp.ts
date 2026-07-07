import "server-only";

import { isEvolutionConfigured, loadEvolutionEnv } from "@zarogmer/env";
import { EvolutionClient } from "@zarogmer/whatsapp";

/**
 * Envio de WhatsApp. Interface preservada; a implementação agora roda sobre
 * @zarogmer/whatsapp (client Evolution compartilhado entre os projetos).
 *
 * `instance` define qual sessão Evolution usar. Quando omitido, cai no
 * fallback global (EVOLUTION_INSTANCE) — usado por signups (antes da org
 * existir) e orgs ainda não migradas pra instância própria (PBI-51).
 */
export interface WhatsAppProvider {
  send(phone: string, body: string, instance?: string): Promise<void>;
}

/**
 * Provider dev/teste: imprime no console em vez de enviar. Nunca em produção
 * (NODE_ENV === "production" força Evolution).
 */
class FakeWhatsAppProvider implements WhatsAppProvider {
  async send(phone: string, body: string, instance?: string): Promise<void> {
    console.log(
      `\n[FakeWhatsApp] -> ${phone}${instance ? ` via instance=${instance}` : ""}\n   ${body}\n`,
    );
  }
}

/** Provider Evolution real, sobre o EvolutionClient da lib. */
class EvolutionWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly client: EvolutionClient,
    private readonly fallbackInstance: string | null,
  ) {}

  async send(phone: string, body: string, instance?: string): Promise<void> {
    const target = instance ?? this.fallbackInstance;
    if (!target) {
      throw new Error(
        "Nenhuma instância WhatsApp configurada. Conecte em /admin/whatsapp.",
      );
    }
    // A lib normaliza o número (só dígitos) e lança em falha de HTTP.
    await this.client.sendText(target, phone, body);
  }
}

let _provider: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (_provider) return _provider;
  if (isEvolutionConfigured()) {
    const env = loadEvolutionEnv();
    _provider = new EvolutionWhatsAppProvider(
      new EvolutionClient({ baseUrl: env.baseUrl, apiKey: env.apiKey }),
      env.fallbackInstance,
    );
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
