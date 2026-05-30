"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, Moon, Sun } from "lucide-react";

import { setThemeAction } from "@/app/admin/configuracoes/theme-action";
import { THEMES, type ThemeId } from "@/lib/server/theme";
import { cn } from "@/lib/utils";

type Props = {
  initialTheme: ThemeId;
  initialDark: boolean;
};

export function ThemeSelector({ initialTheme, initialDark }: Props) {
  const [selected, setSelected] = useState<ThemeId>(initialTheme);
  const [dark, setDark] = useState(initialDark);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Aplica tema temporariamente no <html> pra preview live antes de salvar.
  useEffect(() => {
    const html = document.documentElement;
    const prevTheme = html.getAttribute("data-theme");
    const prevDark = html.classList.contains("dark");
    html.setAttribute("data-theme", selected);
    html.classList.toggle("dark", dark);
    return () => {
      // Restora se desmontar antes de salvar — improvavel em /configuracoes,
      // mas defende caso o usuario navegue sem salvar.
      if (savedAt === null) {
        if (prevTheme) html.setAttribute("data-theme", prevTheme);
        html.classList.toggle("dark", prevDark);
      }
    };
  }, [selected, dark, savedAt]);

  function handleSave() {
    startTransition(async () => {
      const r = await setThemeAction({ theme: selected, dark });
      if (r.ok) setSavedAt(Date.now());
    });
  }

  const dirty = selected !== initialTheme || dark !== initialDark;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 font-display text-base font-bold">Identidade visual</h3>
        <p className="text-xs text-subtle">
          Escolha a paleta que combina com o nicho do seu negócio. Preview é
          aplicado em tempo real — clique em Salvar pra persistir.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((t) => {
          const active = t.id === selected;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={cn(
                "tap relative overflow-hidden rounded-lg border-2 bg-surface p-4 text-left transition-all",
                active
                  ? "border-brand shadow-glow"
                  : "border-line hover:-translate-y-px hover:border-brand/60",
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-fg">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="mb-3 flex gap-1.5">
                <span
                  className="inline-block h-7 w-7 rounded-full border border-line"
                  style={{ background: t.swatch.brand }}
                  aria-hidden
                />
                <span
                  className="inline-block h-7 w-7 rounded-full border border-line"
                  style={{ background: t.swatch.ink }}
                  aria-hidden
                />
                <span
                  className="inline-block h-7 w-7 rounded-full border border-line"
                  style={{ background: t.swatch.surface }}
                  aria-hidden
                />
              </div>
              <div className="font-display text-sm font-bold">{t.label}</div>
              <div className="mt-0.5 text-[11px] text-subtle">
                {t.description}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border border-line bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface text-ink">
              {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
            <div>
              <div className="text-sm font-semibold">Modo escuro</div>
              <div className="text-[11px] text-subtle">
                Inverte superfícies pra leitura noturna
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-pressed={dark}
            className={cn(
              "tap inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
              dark ? "bg-brand" : "bg-surface-3",
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-surface shadow-sm transition-transform",
                dark ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="mono text-[11px] text-subtle">
          {savedAt
            ? "Salvo"
            : dirty
              ? "Mudanças não salvas"
              : "Tudo certo"}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isPending}
          className={cn(
            "tap inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-semibold transition-all",
            dirty && !isPending
              ? "bg-ink text-surface shadow-sm hover:-translate-y-px hover:shadow-md"
              : "cursor-not-allowed bg-surface-2 text-subtle",
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : savedAt ? (
            <>
              <Check className="h-4 w-4" />
              Salvo
            </>
          ) : (
            "Salvar tema"
          )}
        </button>
      </div>
    </div>
  );
}
