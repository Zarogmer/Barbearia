"use client";

import { useEffect, useState } from "react";

import {
  Check,
  Download,
  EllipsisVertical,
  MonitorSmartphone,
  Share,
  SquarePlus,
} from "lucide-react";

import { detectInstallPlatform, type InstallPlatform } from "@/lib/platform";

/** Evento não tipado no lib.dom — só Chrome/Edge Android disparam. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * CTA de instalação do PWA com detecção de plataforma.
 * Android: dispara o prompt nativo via `beforeinstallprompt`.
 * iOS: não existe prompt programático — mostra o passo a passo do Safari.
 */
export function InstallCta() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints));

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null); // o prompt só pode ser usado uma vez
  }

  if (!platform) {
    return <div className="h-28 animate-pulse rounded-xl bg-surface-2" />;
  }

  if (installed) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold">O app já está instalado</p>
          <p className="text-sm text-subtle">
            Procure o ícone da Lustro na tela inicial deste aparelho.
          </p>
        </div>
      </div>
    );
  }

  if (platform === "ios") {
    return (
      <div className="rounded-xl border border-line bg-surface-2 p-4">
        <p className="mb-3 font-semibold">Instale pelo Safari:</p>
        <ol className="space-y-3 text-sm">
          <Step n={1}>Abra esta página no Safari.</Step>
          <Step n={2}>
            Toque em <strong>Compartilhar</strong>
            <Share className="mx-1 inline h-4 w-4 align-text-bottom" />
            na barra do navegador.
          </Step>
          <Step n={3}>
            Role a lista e toque em <strong>Adicionar à Tela de Início</strong>
            <SquarePlus className="mx-1 inline h-4 w-4 align-text-bottom" />.
          </Step>
          <Step n={4}>
            Confirme em <strong>Adicionar</strong>. Pronto — o ícone aparece na tela inicial.
          </Step>
        </ol>
      </div>
    );
  }

  if (platform === "android") {
    return (
      <div className="space-y-3">
        {installEvent ? (
          <button
            type="button"
            onClick={handleInstall}
            className="tap inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg"
          >
            <Download className="h-5 w-5" />
            Instalar agora
          </button>
        ) : (
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="mb-3 font-semibold">Instale pelo Chrome:</p>
            <ol className="space-y-3 text-sm">
              <Step n={1}>
                Toque no menu <EllipsisVertical className="mx-1 inline h-4 w-4 align-text-bottom" />
                no canto do navegador.
              </Step>
              <Step n={2}>
                Toque em <strong>Adicionar à tela inicial</strong> (ou <strong>Instalar app</strong>
                ).
              </Step>
              <Step n={3}>Confirme. O ícone da Lustro aparece na tela inicial.</Step>
            </ol>
          </div>
        )}
        <p className="text-xs text-subtle">
          Nada é baixado da loja — o app instala direto do navegador.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-surface">
        <MonitorSmartphone className="h-4 w-4" />
      </span>
      <div>
        <p className="font-semibold">Abra no celular pra instalar</p>
        <p className="text-sm text-subtle">
          Acesse esta página no navegador do seu celular (Safari no iPhone, Chrome no Android) e
          siga as instruções de instalação.
        </p>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-surface">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
