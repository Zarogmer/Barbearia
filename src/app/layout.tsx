import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Manrope, JetBrains_Mono, Instrument_Serif } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/features/common/ServiceWorkerRegister";
import { auth } from "@/lib/auth";
import { getOrgPublicProfile } from "@/lib/server/orgs";
import { DEFAULT_THEME, getThemeState, isValidTheme } from "@/lib/server/theme";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://lustro.app",
  ),
  title: {
    default: "Lustro — Agendamento online para barbearias e salões",
    template: "%s · Lustro",
  },
  description:
    "Agendamento em 4 toques pelo celular. Painel admin com agenda, serviços e profissionais. Multi-tenant, premium, sem fricção.",
  applicationName: "Lustro",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-192.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Lustro — Agendamento online",
    description:
      "Cliente agenda em 4 toques. Dono gerencia em 1 tela. Multi-tenant, premium.",
    siteName: "Lustro",
    images: [
      {
        url: "/icons/icon-512.svg",
        width: 512,
        height: 512,
        alt: "Lustro",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Lustro — Agendamento online",
    description: "Agendamento em 4 toques. Painel admin em 1 tela.",
    images: ["/icons/icon-512.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers();
  const publicOrgSlug = hdrs.get("x-org-slug");

  // Em rota pública /[slug]/* o tema vem da org dona da vitrine
  // (independente de quem está visitando). Senão usa a logica antiga
  // (membership do user logado > cookie > default).
  let theme: string;
  let dark: boolean;
  if (publicOrgSlug) {
    const publicOrg = await getOrgPublicProfile(publicOrgSlug);
    theme =
      publicOrg?.theme && isValidTheme(publicOrg.theme)
        ? publicOrg.theme
        : DEFAULT_THEME;
    dark = !!publicOrg?.darkMode;
  } else {
    const session = await auth();
    const orgId = session?.user.memberships[0]?.organizationId ?? null;
    const state = await getThemeState(orgId);
    theme = state.theme;
    dark = state.dark;
  }

  const htmlClass = [
    inter.variable,
    manrope.variable,
    jetbrains.variable,
    instrument.variable,
    dark ? "dark" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <html lang="pt-BR" data-theme={theme} className={htmlClass}>
      <body
        className="min-h-screen bg-surface font-sans text-ink antialiased"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
