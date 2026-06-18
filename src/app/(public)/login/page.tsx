import Link from "next/link";

import { LoginForm } from "./LoginForm";

type Props = {
  searchParams: Promise<{ next?: string; signup?: string; email?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, signup, email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Use seu email e senha para acessar o painel.
        </p>

        {signup === "ok" ? (
          <p className="mb-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            🎉 Barbearia criada! Entre com seu email e senha pra começar.
          </p>
        ) : null}

        <LoginForm next={next} defaultEmail={email} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Demo: <code className="rounded bg-muted px-1">admin@demo.com</code> /{" "}
        <code className="rounded bg-muted px-1">senha123</code>
      </p>
    </main>
  );
}
