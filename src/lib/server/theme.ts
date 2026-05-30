import "server-only";

import { cookies } from "next/headers";

import { prismaAdmin } from "@/lib/db";
import {
  DEFAULT_THEME,
  isValidTheme,
  THEMES,
  type ThemeId,
  type ThemeState,
} from "@/lib/themes-catalog";

/**
 * Sistema de temas (PBI-28 + PBI-29 + PBI-30) — funções server-only.
 *
 * Resolução: cookie (preview) > org default (PBI-30) > charcoal-light.
 * - Cookie `theme` + `dark`: sobrescreve por sessão, vive 1 ano
 * - Org `theme` + `darkMode` (PBI-30): default da barbearia
 *
 * Catálogo + tipos vivem em src/lib/themes-catalog.ts (client-safe).
 */

// Re-exporta pra back-compat com imports existentes.
export { THEMES, DEFAULT_THEME, isValidTheme };
export type { ThemeId, ThemeState };

const COOKIE_THEME = "theme";
const COOKIE_DARK = "dark";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Estado de tema efetivo. Cookie tem prioridade sobre org (PBI-30).
 *
 * @param orgId opcional. Se passado, busca tema persistido na org via
 *              prismaAdmin (bypass RLS — query global cross-tenant pelo id).
 *              Usado quando o usuário tem membership ativa.
 */
export async function getThemeState(orgId?: string | null): Promise<ThemeState> {
  const c = await cookies();
  const cookieTheme = c.get(COOKIE_THEME)?.value;
  const cookieDark = c.get(COOKIE_DARK)?.value;

  if (cookieTheme && isValidTheme(cookieTheme)) {
    return { theme: cookieTheme, dark: cookieDark === "1" };
  }

  if (orgId) {
    const orgTheme = await getOrgTheme(orgId);
    if (orgTheme) return orgTheme;
  }

  return { theme: DEFAULT_THEME, dark: false };
}

/**
 * Carrega tema persistido numa org (PBI-30). Null se org não setou.
 * Usa prismaAdmin porque essa lookup acontece no layout root, fora de
 * withTenant — mesma justificativa de getOrgBySlug.
 */
export async function getOrgTheme(orgId: string): Promise<ThemeState | null> {
  const org = await prismaAdmin.organization.findUnique({
    where: { id: orgId },
    select: { theme: true, darkMode: true },
  });
  if (!org?.theme || !isValidTheme(org.theme)) return null;
  return { theme: org.theme, dark: org.darkMode };
}

/** Salva tema como default da org (PBI-30). Owner-gated na action. */
export async function persistOrgTheme(
  orgId: string,
  state: ThemeState,
): Promise<void> {
  await prismaAdmin.organization.update({
    where: { id: orgId },
    data: { theme: state.theme, darkMode: state.dark },
  });
}

/** Salva escolha em cookies. Usado pela Server Action. */
export async function persistTheme(state: ThemeState): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_THEME, state.theme, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  if (state.dark) {
    c.set(COOKIE_DARK, "1", {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
  } else {
    c.delete(COOKIE_DARK);
  }
}
