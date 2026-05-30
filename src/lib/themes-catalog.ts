/**
 * Catálogo de temas (PBI-28+PBI-29). Client-safe: sem cookies/prisma,
 * só constantes + tipos + validador. Importável de client components
 * (ThemeSelector) e server components.
 *
 * Funções com side-effect (cookie, db) ficam em src/lib/server/theme.ts.
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

export type ThemeState = {
  theme: ThemeId;
  dark: boolean;
};

export function isValidTheme(id: string): id is ThemeId {
  return THEME_IDS.includes(id as ThemeId);
}
