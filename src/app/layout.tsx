import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/features/common/ServiceWorkerRegister";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="charcoal"
      className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} ${instrument.variable}`}
    >
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
