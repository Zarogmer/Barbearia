import Link from "next/link";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          Esqueci minha senha
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Vamos te mandar um link por email pra redefinir.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Lembrou?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Voltar pro login
          </Link>
        </p>
      </div>
    </main>
  );
}
