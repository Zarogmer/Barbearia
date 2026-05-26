import { LogOut } from "lucide-react";

import { CustomerProfileForm } from "@/components/features/customer/CustomerProfileForm";
import { auth, signOut } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";

export default async function PerfilTab({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  const { orgSlug } = await params;
  // Re-busca o User pelo id da sessão pra ter phone atualizado (session só
  // tem name/email — phone fica direto na tabela)
  const user = session?.user?.id
    ? await prismaAdmin.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true },
      })
    : null;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Sua conta</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Perfil</h1>
      </header>

      <div className="flex items-center gap-4 rounded-md border border-line bg-surface p-5">
        <span className="avatar-ring">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-base font-bold">
            {initials}
          </span>
        </span>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold">
            {user?.name ?? "Cliente"}
          </div>
          <div className="mono truncate text-xs text-subtle">{user?.email}</div>
        </div>
      </div>

      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-sm font-bold">Editar dados</h2>
        <CustomerProfileForm
          defaultName={user?.name ?? ""}
          defaultPhone={user?.phone ?? ""}
        />
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: `/${orgSlug}` });
        }}
      >
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-semibold text-danger transition-all hover:bg-danger/5"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </div>
  );
}
