import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { ResetPasswordForm } from "./ResetPasswordForm";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Nova senha</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Escolha uma senha forte. Você vai usar pra entrar no painel.
        </p>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Link inválido. Use o link que chegou no seu email ou peça um
                novo.
              </span>
            </div>
            <Link
              href="/esqueci-senha"
              className="block text-center text-sm font-medium text-primary hover:underline"
            >
              Pedir novo link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
