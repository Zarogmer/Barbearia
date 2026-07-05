import { notFound, redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/app/admin/_logout-action";
import { SuperAdminNav } from "@/components/features/superadmin/SuperAdminNav";
import { PageTransition } from "@/components/ui/page-transition";
import { auth } from "@/lib/auth";

/**
 * PBI-55: layout do painel super-admin (cross-tenant).
 *
 * Gate 404 (nao 403) pra nao vazar existencia do painel a usuarios comuns.
 * Sem billing gate — super-admin nao passa por assinatura.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/superadmin/dashboard");
  }
  if (!session.user.isSuperAdmin) {
    // 404 deliberado: nao dizemos "voce nao tem permissao", so "nao existe".
    notFound();
  }

  const userName = session.user.name ?? "Super admin";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-surface-2 lg:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden border-r border-line bg-surface lg:flex lg:w-60 lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-line px-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-[hsl(var(--surface))]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-bold">Painel master</div>
            <div className="mono truncate text-[10px] uppercase tracking-wider text-subtle">
              super admin
            </div>
          </div>
        </div>

        <SuperAdminNav />

        <div className="mt-auto border-t border-line p-3">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-line p-2">
            <span className="avatar-ring">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                {initials}
              </span>
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-semibold">{userName}</div>
              <div className="truncate text-[10px] text-subtle">{session.user.email ?? "—"}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar simplificada */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-[hsl(var(--surface))]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold">Painel master</div>
            <div className="mono truncate text-[10px] uppercase tracking-wider text-subtle">
              super admin
            </div>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md p-2 text-subtle hover:bg-surface-2 hover:text-ink"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </header>

      {/* Nav mobile horizontal */}
      <div className="border-b border-line bg-surface lg:hidden">
        <SuperAdminNav />
      </div>

      <main className="flex-1 pb-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
