import Link from "next/link";
import { ArrowRight, Scissors, LayoutDashboard, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-40" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="eyebrow mb-6">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          Protótipo · MVP em 7 dias
        </div>

        <h1 className="mb-5 text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
          Agendar virou{" "}
          <span className="relative">
            <span className="serif italic text-brand">arte</span>
            <svg
              aria-hidden
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 200 12"
              fill="none"
            >
              <path
                d="M2 9C50 3 100 3 198 9"
                stroke="hsl(var(--brand))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          .
        </h1>

        <p className="mb-10 max-w-xl text-lg leading-relaxed text-subtle">
          Sistema multi-tenant de agendamento para barbearias e salões. Cliente agenda em 4 toques.
          Dono gerencia tudo do desktop.{" "}
          <span className="font-medium text-ink">Premium, rápido, sem fricção.</span>
        </p>

        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <Link
            href="/barbearia-demo"
            className="group relative overflow-hidden rounded-lg border border-line bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-subtle transition-colors group-hover:text-brand">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Scissors className="h-5 w-5" />
            </div>
            <h2 className="mb-1.5 font-display text-lg font-bold tracking-tight">
              Fluxo do cliente
            </h2>
            <p className="text-sm text-subtle">
              Veja como um cliente agenda um corte em 4 passos pelo celular.
            </p>
            <span className="mono mt-4 inline-block text-[10px] uppercase tracking-wider text-subtle">
              /barbearia-demo
            </span>
          </Link>

          <Link
            href="/admin/dashboard"
            className="group relative overflow-hidden rounded-lg border border-line bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-subtle transition-colors group-hover:text-brand">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h2 className="mb-1.5 font-display text-lg font-bold tracking-tight">
              Painel admin
            </h2>
            <p className="text-sm text-subtle">
              Visão do dono: agenda do dia, KPIs, serviços, profissionais.
            </p>
            <span className="mono mt-4 inline-block text-[10px] uppercase tracking-wider text-subtle">
              /admin/dashboard
            </span>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-8">
          <div>
            <div className="num text-3xl font-extrabold text-ink">15</div>
            <div className="text-xs text-subtle">PBIs no backlog</div>
          </div>
          <div>
            <div className="num text-3xl font-extrabold text-ink">4</div>
            <div className="text-xs text-subtle">toques pra agendar</div>
          </div>
          <div>
            <div className="num text-3xl font-extrabold text-ink">3</div>
            <div className="text-xs text-subtle">paletas</div>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs text-subtle">
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            Design system{" "}
            <code className="mono rounded bg-surface-2 px-1.5 py-0.5 text-[10px]">
              Lustro
            </code>{" "}
            · paleta Charcoal Premium
          </span>
        </div>
      </div>
    </main>
  );
}
