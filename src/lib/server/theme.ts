import "server-only";

import { cookies } from "next/headers";

/**
 * Sistema de temas (PBI-28 + PBI-29 tattoo).
 *
 * Persistência: cookies `theme` e `dark`.
 * - `theme`: charcoal | oldschool | viking | salao | manicure | luxe | tattoo
 * - `dark`: "1" se ativo, ausente caso contrário
 *
 * Default sem cookie: charcoal-light.
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

export async function getThemeState(): Promise<ThemeState> {
  const c = await cookies();
  const rawTheme = c.get(COOKIE_THEME)?.value;
  const theme = THEME_IDS.includes(rawTheme as ThemeId)
    ? (rawTheme as ThemeId)
    : DEFAULT_THEME;
  const dark = c.get(COOKIE_DARK)?.value === "1";
  return { theme, dark };
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
