/**
 * Teste manual do WhatsAppProvider (Evolution API).
 *
 * Uso:
 *   pnpm tsx scripts/test-whatsapp.ts <telefone> [mensagem]
 *
 * Exemplo:
 *   pnpm tsx scripts/test-whatsapp.ts +5511999998888 "Oi, teste!"
 *
 * Requer .env na raiz com:
 *   EVOLUTION_API_URL
 *   EVOLUTION_API_KEY
 *   EVOLUTION_INSTANCE
 *
 * Sem essas vars, o FakeWhatsAppProvider só loga no console (útil pra
 * validar o caminho de código sem mandar mensagem real).
 *
 * Antes de rodar:
 *  1. Instância "barbearia" criada na Evolution API
 *  2. QR code escaneado com o WhatsApp do dono
 *  3. State = "open" em GET /instance/connectionState/barbearia
 */
import "dotenv/config";

import { getWhatsAppProvider } from "../src/lib/server/whatsapp";

async function main(): Promise<void> {
  const [phone, ...msgParts] = process.argv.slice(2);
  const message = msgParts.join(" ") || "Teste do provider Evolution";

  if (!phone) {
    console.error(
      "Uso: pnpm tsx scripts/test-whatsapp.ts <telefone> [mensagem]",
    );
    console.error(
      "Ex:  pnpm tsx scripts/test-whatsapp.ts +5511999998888 'Oi!'",
    );
    process.exit(1);
  }

  const url = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  console.log(`Telefone: ${phone}`);
  console.log(`URL:      ${url ?? "(vazio - modo Fake)"}`);
  console.log(`Instance: ${instance ?? "(vazio)"}`);
  console.log(`Mensagem: ${message}`);
  console.log();

  const provider = getWhatsAppProvider();
  await provider.send(phone, message);
  console.log("Enviado");
}

main().catch((e) => {
  console.error("Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
