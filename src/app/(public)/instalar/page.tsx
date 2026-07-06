import Link from "next/link";

import { BellRing, Rocket, Scissors, WifiOff } from "lucide-react";

import { InstallCta } from "@/components/features/common/InstallCta";

export const metadata = {
  title: "Instalar o app",
  description:
    "Instale a Lustro na tela inicial do seu celular — direto do navegador, sem loja e sem download pesado.",
};

export default function InstalarPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <Link href="/" className="text-xs text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <div className="mt-6 flex flex-col items-center text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-[hsl(var(--surface))] shadow-md">
          <Scissors className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Leve a Lustro no bolso</h1>
        <p className="mt-2 text-sm text-subtle">
          Instale o app na tela inicial do seu celular — direto do navegador, sem loja e sem
          download pesado.
        </p>
      </div>

      <div className="mt-8">
        <InstallCta />
      </div>

      <ul className="mt-10 space-y-4 text-sm">
        <li className="flex items-start gap-3">
          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <span>
            <strong>Abre como app de verdade</strong> — tela cheia, sem barra de navegador, ícone na
            tela inicial.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <span>
            <strong>Leve e rápido</strong> — ocupa quase nada de espaço e carrega na hora.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <span>
            <strong>Sempre atualizado</strong> — cada abertura já traz a versão mais nova, sem
            atualizar na loja.
          </span>
        </li>
      </ul>
    </main>
  );
}
