import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
}

/**
 * PBI-58: retorna hostname publico pra exibir em UI (ex: prefixo do slug
 * em /admin/configuracoes). Client-safe — le NEXT_PUBLIC_APP_URL que eh
 * embutida no bundle. Fallback: "lustro.app" quando a var nao existe (dev
 * sem .env ou build antes de setar), evitando exibir string vazia na UI.
 *
 * Retorna so o host (sem protocolo ou path final), pronto pra concatenar
 * com "/{slug}".
 */
export function getPublicHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return "lustro.app";
  try {
    return new URL(raw).host;
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}
