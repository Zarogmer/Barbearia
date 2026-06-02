import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Percent,
  Receipt,
  Scissors,
  Smartphone,
  Sparkles,
  Star,
} from "lucide-react";

export const metadata = {
  title: "Lustro — Sistema premium pra barbearias e salões",
  description:
    "Agendamento online 24/7, PDV de balcão, comissões automáticas. Tudo no mesmo lugar, sem fricção. Comece grátis.",
  openGraph: {
    title: "Lustro — Sua barbearia merece um sistema premium",
    description:
      "Agendamento online, PDV e comissões automáticas. Comece grátis em 5 minutos.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="bg-surface-2">
      <TopNav />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <ProductPreview />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </main>
  );
}

// ─── Top nav ─────────────────────────────────────────────────────────

function TopNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-[hsl(var(--surface))]">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Lustro
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-subtle transition-colors hover:text-ink sm:inline"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="tap inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-4 text-sm font-semibold text-surface transition-all hover:-translate-y-px hover:shadow-md"
          >
            Começar grátis
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="grid-bg absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-6xl px-5 py-16 md:py-24 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="flex flex-col justify-center">
          <div className="eyebrow mb-5 w-fit">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Agendamento premium
          </div>
          <h1 className="mb-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Sua barbearia merece um sistema{" "}
            <span className="relative whitespace-nowrap">
              <span className="serif italic text-brand">premium</span>
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
          <p className="mb-8 max-w-xl text-base leading-relaxed text-subtle md:text-lg">
            Agendamento online 24/7, PDV de balcão e comissões automáticas.
            Tudo no mesmo lugar — sem planilha, sem app pago caro,{" "}
            <span className="font-medium text-ink">sem fricção</span>.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className="tap inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/barbearia-demo"
              className="tap inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 text-sm font-semibold text-ink transition-all hover:border-brand hover:shadow-sm"
            >
              Ver demo ao vivo
            </Link>
          </div>
          <p className="mt-4 mono text-[11px] text-subtle">
            ✓ Grátis pra começar · ✓ Sem cartão · ✓ Setup em 5 minutos
          </p>
        </div>

        <div className="mt-12 lg:mt-0">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  // Mockup compósito: card de agendamento + miniatura admin
  return (
    <div className="relative mx-auto max-w-md">
      {/* Card mobile "Agendar" */}
      <div className="relative z-10 rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="eyebrow">Agendar</div>
          <div className="mono text-[10px] uppercase tracking-wider text-subtle">
            barbearia-vini
          </div>
        </div>
        <div className="space-y-2">
          <MockSelector
            icon={<Scissors className="h-4 w-4" />}
            primary="Corte + barba"
            secondary="45min · R$ 80,00"
            done
          />
          <MockSelector
            icon={<Calendar className="h-4 w-4" />}
            primary="João Silva"
            secondary="quinta, 14 nov · 14:30"
            done
          />
        </div>
        <button className="tap mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-brand-fg shadow-sm">
          Confirmar agendamento
          <Check className="h-4 w-4" />
        </button>
      </div>

      {/* Card dashboard atrás */}
      <div className="absolute -right-6 -top-6 z-0 hidden w-64 rotate-3 rounded-xl border border-line bg-surface p-4 shadow-lg md:block">
        <div className="mb-2 mono text-[9px] uppercase tracking-wider text-subtle">
          Hoje
        </div>
        <div className="font-display text-2xl font-extrabold">12 agendamentos</div>
        <div className="mt-1 mono text-xs text-brand">R$ 1.240,00 estimados</div>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full bg-brand"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      </div>

      {/* Decorative blob */}
      <div className="absolute -bottom-12 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-brand/30 blur-3xl" />
    </div>
  );
}

function MockSelector({
  icon,
  primary,
  secondary,
  done,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-3">
      <span
        className={
          done
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-subtle"
        }
      >
        {done ? <Check className="h-4 w-4" /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{primary}</div>
        <div className="mono truncate text-[10px] text-subtle">{secondary}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-subtle" />
    </div>
  );
}

// ─── Social proof strip ─────────────────────────────────────────────

function SocialProof() {
  return (
    <section className="border-y border-line bg-surface py-8">
      <div className="mx-auto max-w-6xl px-5">
        <p className="mb-5 text-center mono text-[10px] uppercase tracking-[0.18em] text-subtle">
          Pensado pra quem cobra premium
        </p>
        <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
          {[
            "Barbearias",
            "Salões",
            "Estúdios tattoo",
            "Estética",
            "Manicure",
            "Massoterapia",
          ].map((label) => (
            <div
              key={label}
              className="flex items-center justify-center font-display text-xs font-bold tracking-tight text-subtle sm:text-sm"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────

function Features() {
  return (
    <section className="bg-surface-2 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-4 w-fit">Tudo que você precisa</div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Da agenda ao caixa, sem trocar de app.
          </h2>
          <p className="mt-3 text-sm text-subtle md:text-base">
            Substitui WhatsApp pra agendamento, planilha pra controle de
            comissões e caderno pra anotações de comanda.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<Smartphone className="h-5 w-5" />}
            title="Agendamento 24/7"
            description="Cliente agenda pelo celular em 3 toques. Confirma por WhatsApp — sem precisar criar conta. Sua agenda fecha sozinha."
          />
          <FeatureCard
            icon={<Receipt className="h-5 w-5" />}
            title="PDV de balcão"
            description="Comanda aberta, itens, descontos, pagamento misto (dinheiro + Pix + cartão). Fecha o dia com 2 cliques."
          />
          <FeatureCard
            icon={<Percent className="h-5 w-5" />}
            title="Comissões automáticas"
            description="Configure % por profissional e por serviço uma vez. O sistema calcula no fim do mês e registra pagamento."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 transition-all hover:-translate-y-1 hover:border-brand hover:shadow-lg">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
        {icon}
      </div>
      <h3 className="mb-2 font-display text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-subtle">{description}</p>
    </div>
  );
}

// ─── How it works ───────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Cadastre serviços",
      description:
        "Em 2 minutos: nome, duração, preço. Quantos quiser.",
    },
    {
      n: "02",
      title: "Adicione profissionais",
      description: "Foto, bio e horários. Cada um vê só a própria agenda.",
    },
    {
      n: "03",
      title: "Compartilhe o link",
      description:
        "Envie sualustro.app/sua-barbearia pro WhatsApp. Clientes agendam sozinhos.",
    },
  ];
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-4 w-fit">3 passos</div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Pronto pra receber agendamentos em 10 minutos.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="mono mb-3 text-3xl font-extrabold text-brand">{s.n}</div>
              <h3 className="mb-2 font-display text-lg font-bold tracking-tight">
                {s.title}
              </h3>
              <p className="text-sm text-subtle">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Product preview ────────────────────────────────────────────────

function ProductPreview() {
  return (
    <section className="bg-surface-2 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-4 w-fit">No celular e no balcão</div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Um app pro cliente, um sistema pro balcão.
          </h2>
          <p className="mt-3 text-sm text-subtle md:text-base">
            Mobile-first pro cliente final. Denso e produtivo pro dono no
            desktop. Cada superfície otimizada pro seu uso.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-3 eyebrow w-fit">App cliente</div>
            <h3 className="mb-2 font-display text-xl font-bold">Mobile nativo</h3>
            <p className="mb-5 text-sm text-subtle">
              Bottom nav, single-screen agendamento, histórico, feed da
              barbearia, avaliações. Parece app instalado.
            </p>
            <ul className="space-y-2 text-sm">
              <FeatureBullet>Confirmação por WhatsApp sem criar conta</FeatureBullet>
              <FeatureBullet>Lembrete automático no dia anterior</FeatureBullet>
              <FeatureBullet>Avalia o atendimento em 1 toque</FeatureBullet>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-ink p-6 text-[hsl(var(--surface))]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand/20 px-3 py-1 mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
              Painel admin
            </div>
            <h3 className="mb-2 font-display text-xl font-bold">Desktop denso</h3>
            <p className="mb-5 text-sm opacity-80">
              Agenda diária, KPIs, comandas, clientes, comissões. Pra usar no
              monitor do balcão durante o atendimento.
            </p>
            <ul className="space-y-2 text-sm">
              <FeatureBullet inverted>Dashboard com faturamento do dia</FeatureBullet>
              <FeatureBullet inverted>Fecha comanda com pagamento misto</FeatureBullet>
              <FeatureBullet inverted>Calcula comissão mensal por prof</FeatureBullet>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBullet({
  children,
  inverted,
}: {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={
          inverted
            ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-ink"
            : "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
        }
      >
        <Check className="h-2.5 w-2.5" />
      </span>
      <span className={inverted ? "opacity-90" : ""}>{children}</span>
    </li>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section className="bg-surface py-20" id="pricing">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-4 w-fit">Preço justo</div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Comece grátis. Cresça sem surpresa.
          </h2>
          <p className="mt-3 text-sm text-subtle">
            Sem fidelidade. Sem setup fee. Cancele quando quiser.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          <PriceCard
            name="Starter"
            price="Grátis"
            tagline="Pra testar com tranquilidade"
            features={[
              "Até 50 agendamentos/mês",
              "1 profissional",
              "Agendamento online",
              "Suporte por email",
            ]}
            cta="Começar grátis"
            highlight={false}
          />
          <PriceCard
            name="Pro"
            price="R$ 79"
            priceSuffix="/mês"
            tagline="Quando você roda comigo"
            features={[
              "Agendamentos ilimitados",
              "Profissionais ilimitados",
              "PDV + comandas",
              "Comissões automáticas",
              "Suporte prioritário",
            ]}
            cta="Assinar Pro"
            highlight
          />
        </div>

        <p className="mt-6 text-center mono text-[10px] text-subtle">
          * Sistema de billing em fase final. Cobrança real só após primeira
          confirmação por email.
        </p>
      </div>
    </section>
  );
}

function PriceCard({
  name,
  price,
  priceSuffix,
  tagline,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "relative rounded-2xl border-2 border-brand bg-brand-soft/40 p-6 shadow-glow"
          : "rounded-2xl border border-line bg-surface p-6"
      }
    >
      {highlight && (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 mono text-[10px] font-bold uppercase tracking-wider text-brand-fg">
          <Sparkles className="h-2.5 w-2.5" />
          Mais escolhido
        </div>
      )}
      <div className="mb-1 font-display text-lg font-bold">{name}</div>
      <div className="mb-1 text-xs text-subtle">{tagline}</div>
      <div className="mb-5 flex items-baseline gap-1">
        <span className="num font-display text-4xl font-extrabold tracking-tight">
          {price}
        </span>
        {priceSuffix && (
          <span className="mono text-xs text-subtle">{priceSuffix}</span>
        )}
      </div>
      <ul className="mb-6 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
              <Check className="h-2.5 w-2.5" />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/cadastro"
        className={
          highlight
            ? "tap flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-ink text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
            : "tap flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-sm font-semibold text-ink transition-all hover:border-brand"
        }
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────

function Testimonials() {
  const items = [
    {
      quote:
        "Reduzi o tempo gasto com WhatsApp em 80%. Cliente agenda sozinho e eu só atendo.",
      name: "Vinícius B.",
      role: "Barbearia Vini · São Paulo",
    },
    {
      quote:
        "O cálculo automático de comissão era o que eu mais queria. Acabou planilha e discussão no fim do mês.",
      name: "Carla M.",
      role: "Studio Beleza · BH",
    },
    {
      quote:
        "Layout sério, não parece template free. Meus clientes elogiam o app na hora de agendar.",
      name: "Rafael S.",
      role: "Old Style Barber · Curitiba",
    },
  ];

  return (
    <section className="bg-surface-2 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="eyebrow mx-auto mb-4 w-fit">Quem usa diz</div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Construído com barbearia premium em mente.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <div className="mb-3 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="h-3.5 w-3.5 fill-warn text-warn"
                  />
                ))}
              </div>
              <blockquote className="mb-4 text-sm leading-relaxed text-ink">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="mono text-[11px] text-subtle">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-6 text-center mono text-[10px] text-subtle">
          * Depoimentos ilustrativos enquanto coletamos os primeiros clientes
          reais.
        </p>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-[hsl(var(--surface))]">
      <div className="grid-bg absolute inset-0 opacity-15" />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <div className="eyebrow mx-auto mb-5 w-fit">Pronto?</div>
        <h2 className="mb-4 font-display text-3xl font-extrabold tracking-tight md:text-5xl">
          Sua próxima cliente agenda em 3 toques.
        </h2>
        <p className="mb-8 text-sm opacity-80 md:text-base">
          Setup em 5 minutos. Sem cartão. Cancele quando quiser.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/cadastro"
            className="tap inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-7 font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg"
          >
            Começar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/barbearia-demo"
            className="inline-flex h-12 items-center gap-2 text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
          >
            Ver demo primeiro
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-line bg-surface-2 py-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[hsl(var(--surface))]">
              <Scissors className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-base font-bold">Lustro</span>
            <span className="mono ml-2 text-[10px] text-subtle">
              · Charcoal Premium
            </span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-subtle">
            <Link href="/login" className="hover:text-ink">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-ink">
              Cadastro
            </Link>
            <Link href="/barbearia-demo" className="hover:text-ink">
              Demo
            </Link>
            <a href="mailto:contato@lustro.app" className="hover:text-ink">
              Contato
            </a>
          </nav>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 sm:flex-row">
          <p className="mono text-[10px] text-subtle">
            © {new Date().getFullYear()} Lustro · Sistema pra barbearia e salão
          </p>
          <p className="mono inline-flex items-center gap-1 text-[10px] text-subtle">
            <Clock className="h-3 w-3" />
            Online · Brasília
          </p>
        </div>
      </div>
    </footer>
  );
}
