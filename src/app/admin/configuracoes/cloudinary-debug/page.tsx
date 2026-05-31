import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { CloudinaryDebugPanel } from "./CloudinaryDebugPanel";

function mask(value: string | undefined): string {
  if (!value) return "(não definido)";
  const v = value.trim();
  if (v.length <= 4) return "***";
  return `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} chars)`;
}

export default async function CloudinaryDebugPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/configuracoes/cloudinary-debug");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-2xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode ver essa página.
        </p>
      </div>
    );
  }

  const cfg = {
    CLOUDINARY_CLOUD_NAME: mask(process.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: mask(process.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: mask(process.env.CLOUDINARY_API_SECRET),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: mask(
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    ),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-8">
      <header className="space-y-1">
        <div className="eyebrow mb-3">Debug</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Cloudinary
        </h1>
        <p className="text-sm text-subtle">
          Diagnóstico da configuração de upload de imagens. Use quando o
          upload falhar com &quot;Invalid Signature&quot; ou 401.
        </p>
      </header>

      <section className="space-y-2 rounded-md border border-line bg-surface p-5">
        <div className="mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
          Variáveis no ambiente atual
        </div>
        <ul className="space-y-1 text-sm">
          {Object.entries(cfg).map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
              <span className="mono text-xs">{k}</span>
              <span className="mono text-xs text-subtle">{v}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-subtle">
          Valores mascarados pra não vazar. Se algum está &quot;(não
          definido)&quot;, configure no .env (dev) ou Railway (prod) e
          reinicie o servidor.
        </p>
      </section>

      <CloudinaryDebugPanel />

      <section className="space-y-2 rounded-md border border-line bg-surface-2 p-5 text-xs text-subtle">
        <div className="font-semibold text-ink">Como o erro 401 acontece</div>
        <p>
          O frontend faz POST direto pra api.cloudinary.com com uma{" "}
          <span className="mono">signature</span> SHA-1 gerada pelo nosso
          server usando <span className="mono">CLOUDINARY_API_SECRET</span>.
          Se o secret no env não bater com o do dashboard Cloudinary,
          a signature fica errada e o Cloudinary devolve{" "}
          <span className="mono">401 Invalid Signature</span>.
        </p>
        <p>
          <strong>Fix:</strong> copiar o secret EXATAMENTE como aparece
          em Cloudinary → Settings → API Keys e colar no env. Não tem
          espaço, não tem quebra-linha no final.
        </p>
      </section>
    </div>
  );
}
