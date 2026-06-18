import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __setWhatsAppProviderForTest,
  getWhatsAppProvider,
} from "@/lib/server/whatsapp";

beforeEach(() => {
  __setWhatsAppProviderForTest(null);
  vi.stubEnv("EVOLUTION_API_URL", "https://evo.example.com");
  vi.stubEnv("EVOLUTION_API_KEY", "test-key");
  vi.stubEnv("EVOLUTION_INSTANCE", "barbearia");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  __setWhatsAppProviderForTest(null);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("EvolutionWhatsAppProvider", () => {
  it("usa fallback EVOLUTION_INSTANCE quando instance nao e passada", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const provider = getWhatsAppProvider();
    await provider.send("+5511999998888", "Oi, lembrete!");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://evo.example.com/message/sendText/barbearia");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.apikey).toBe("test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init?.body as string) as {
      number: string;
      text: string;
    };
    expect(body.number).toBe("5511999998888");
    expect(body.text).toBe("Oi, lembrete!");
  });

  it("remove caracteres nao-numericos do telefone (E.164 -> digits)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const provider = getWhatsAppProvider();
    await provider.send("+55 (11) 99999-8888", "ok");

    const body = JSON.parse(
      fetchMock.mock.calls[0]![1]?.body as string,
    ) as { number: string };
    expect(body.number).toBe("5511999998888");
  });

  it("normaliza trailing slash da URL base", async () => {
    vi.stubEnv("EVOLUTION_API_URL", "https://evo.example.com/");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const provider = getWhatsAppProvider();
    await provider.send("+5511999998888", "msg");

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://evo.example.com/message/sendText/barbearia",
    );
  });

  it("lanca erro com mensagem amigavel quando Evolution retorna 4xx/5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("instance not connected", { status: 400 }),
    );

    const provider = getWhatsAppProvider();
    await expect(provider.send("+5511999998888", "msg")).rejects.toThrow(
      /Evolution API falhou \(400\): instance not connected/,
    );
  });

  it("lanca erro se o telefone fica vazio apos limpar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );

    const provider = getWhatsAppProvider();
    await expect(provider.send("---", "msg")).rejects.toThrow(
      /Telefone invalido/,
    );
  });
});

describe("getWhatsAppProvider factory", () => {
  it("retorna FakeWhatsAppProvider quando env vars vazias em dev", async () => {
    vi.stubEnv("EVOLUTION_API_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = getWhatsAppProvider();
    await provider.send("+5511999998888", "dev msg");

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0]?.[0]).toMatch(/FakeWhatsApp/);
  });

  it("crasha em producao sem env vars", () => {
    vi.stubEnv("EVOLUTION_API_URL", "");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    vi.stubEnv("EVOLUTION_INSTANCE", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getWhatsAppProvider()).toThrow(
      /WhatsApp provider nao configurado em producao/,
    );
  });

  // PBI-51: multi-tenant
  it("usa instance passada por chamada (sobrescreve fallback)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const provider = getWhatsAppProvider();
    await provider.send("+5511999998888", "msg pra org X", "lustro-org-x");

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://evo.example.com/message/sendText/lustro-org-x");
  });

  it("falha com mensagem clara quando nao ha instance nem fallback", async () => {
    vi.stubEnv("EVOLUTION_INSTANCE", "");
    __setWhatsAppProviderForTest(null);

    const provider = getWhatsAppProvider();
    await expect(provider.send("+5511999998888", "msg")).rejects.toThrow(
      /Nenhuma instância WhatsApp configurada/,
    );
  });
});
