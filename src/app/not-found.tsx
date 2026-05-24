import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12 text-center sm:max-w-lg">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-3 text-subtle">
        <Compass className="h-10 w-10" />
      </div>
      <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight">
        Página não encontrada
      </h1>
      <p className="mb-7 max-w-xs text-sm text-subtle">
        O link pode ter mudado ou a barbearia não existe mais. Tente
        voltar para a página inicial.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
