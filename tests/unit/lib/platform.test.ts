import { describe, expect, it } from "vitest";

import { detectInstallPlatform } from "@/lib/platform";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ipadLegacy:
    "Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1",
  // iPadOS 13+ se anuncia como Macintosh — só o touch denuncia que é iPad
  ipadOs13:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
};

describe("detectInstallPlatform", () => {
  it("detecta iPhone como ios", () => {
    expect(detectInstallPlatform(UA.iphone, 5)).toBe("ios");
  });

  it("detecta iPad antigo (UA com 'iPad') como ios", () => {
    expect(detectInstallPlatform(UA.ipadLegacy, 5)).toBe("ios");
  });

  it("detecta iPadOS 13+ (Macintosh + touch) como ios", () => {
    expect(detectInstallPlatform(UA.ipadOs13, 5)).toBe("ios");
  });

  it("Mac de verdade (Macintosh sem touch) NÃO é ios", () => {
    expect(detectInstallPlatform(UA.macSafari, 0)).toBe("other");
  });

  it("detecta Android (Chrome) como android", () => {
    expect(detectInstallPlatform(UA.androidChrome, 5)).toBe("android");
  });

  it("detecta Android (Samsung Internet) como android", () => {
    expect(detectInstallPlatform(UA.androidSamsung, 5)).toBe("android");
  });

  it("desktop Windows é other", () => {
    expect(detectInstallPlatform(UA.windowsChrome, 0)).toBe("other");
  });

  it("user agent vazio é other", () => {
    expect(detectInstallPlatform("", 0)).toBe("other");
  });

  it("maxTouchPoints é opcional (default 0)", () => {
    expect(detectInstallPlatform(UA.macSafari)).toBe("other");
    expect(detectInstallPlatform(UA.iphone)).toBe("ios");
  });
});
