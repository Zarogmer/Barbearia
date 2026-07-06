export type InstallPlatform = "ios" | "android" | "other";

/**
 * Detecta a plataforma pra fins de instalação do PWA. Função pura:
 * recebe o user agent e o número de pontos de toque (navigator.maxTouchPoints).
 *
 * iPadOS 13+ se anuncia como "Macintosh" no user agent — a única pista
 * de que é um iPad é ter tela de toque, daí o segundo parâmetro.
 */
export function detectInstallPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("macintosh") && maxTouchPoints > 1) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}
