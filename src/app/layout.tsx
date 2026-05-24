import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";
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
  title: {
    default: "Lustro — Agendamento online para barbearias e salões",
    template: "%s · Lustro",
  },
  description:
    "Agendamento em 4 toques pelo celular. Painel admin com agenda, serviços e profissionais. Multi-tenant, premium, sem fricção.",
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
      </body>
    </html>
  );
}
