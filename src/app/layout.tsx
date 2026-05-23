import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barbearia — Agendamento online",
  description:
    "Sistema de agendamento online para barbearias e salões. Marque seu horário em 3 cliques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
