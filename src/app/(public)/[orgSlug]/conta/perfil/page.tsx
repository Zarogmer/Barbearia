import { LogOut, User as UserIcon } from "lucide-react";

import { auth, signOut } from "@/lib/auth";

/**
 * Placeholder do tab Perfil — PBI-48 Fase 7 implementa edição completa
 * (nome, email, telefone, avatar). Por enquanto: dados read-only + sair.
 */
export default async function PerfilTab({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  const { orgSlug } = await params;
  const user = session?.user;

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

      <div className="rounded-md border border-dashed border-line bg-surface-2 p-8 text-center">
        <UserIcon className="mx-auto mb-3 h-8 w-8 text-subtle" />
        <p className="mb-2 font-display text-sm font-bold">Edição em breve</p>
        <p className="text-xs text-subtle">
          Editar nome, telefone e avatar virá no PBI-48 Fase 7.
        </p>
      </div>

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
