import "server-only";

import { cookies } from "next/headers";

import { prismaAdmin } from "@/lib/db";

/**
 * Sistema de temas (PBI-28 + PBI-29 + PBI-30).
 *
 * Resolução: cookie (preview) > org default (PBI-30) > charcoal-light.
 * - Cookie `theme` + `dark`: sobrescreve por sessão, vive 1 ano
 * - Org `theme` + `darkMode` (PBI-30): default da barbearia
 *
 * Themes: charcoal | oldschool | viking | salao | manicure | luxe | tattoo
 */

export const THEMES = [
  {
    id: "charcoal",
    label: "Charcoal Premium",
    description: "Barbearia masculina, ar editorial",
    swatch: { brand: "#F1A015", ink: "#0A0A0F", surface: "#FFFFFF" },
  },
  {
    id: "oldschool",
    label: "Old School Barber",
    description: "Vinho retrô + creme antigo",
    swatch: { brand: "#A0263F", ink: "#291810", surface: "#F8F1E5" },
  },
  {
    id: "viking",
    label: "Viking Barber",
    description: "Vermelho metálico, atitude",
    swatch: { brand: "#C92626", ink: "#13161D", surface: "#F8F9FB" },
  },
  {
    id: "salao",
    label: "Salão Sofisticado",
    description: "Rose dourado, salão feminino premium",
    swatch: { brand: "#D9477A", ink: "#2F1C24", surface: "#FCFAF5" },
  },
  {
    id: "manicure",
    label: "Manicure Pastel",
    description: "Lilás suave, manicure / pedicure",
    swatch: { brand: "#A553D1", ink: "#2D1F33", surface: "#FCF8FE" },
  },
  {
    id: "luxe",
    label: "Maquiagem Luxo",
    description: "Bronze + dourado nude",
    swatch: { brand: "#C58128", ink: "#2A1E14", surface: "#FBF6EE" },
  },
  {
    id: "tattoo",
    label: "Tattoo Studio",
    description: "Preto profundo + amarelo neon, atitude underground",
    swatch: { brand: "#FFD700", ink: "#0A0A0A", surface: "#F5F5F5" },
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const THEME_IDS = THEMES.map((t) => t.id) as ThemeId[];

export const DEFAULT_THEME: ThemeId = "charcoal";

const COOKIE_THEME = "theme";
const COOKIE_DARK = "dark";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ThemeState = {
  theme: ThemeId;
  dark: boolean;
};

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

  if (cookieTheme && THEME_IDS.includes(cookieTheme as ThemeId)) {
    return { theme: cookieTheme as ThemeId, dark: cookieDark === "1" };
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
  if (!org?.theme || !THEME_IDS.includes(org.theme as ThemeId)) return null;
  return { theme: org.theme as ThemeId, dark: org.darkMode };
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

export function isValidTheme(id: string): id is ThemeId {
  return THEME_IDS.includes(id as ThemeId);
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
