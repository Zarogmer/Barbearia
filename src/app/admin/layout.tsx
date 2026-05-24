import { redirect } from "next/navigation";
import { LogOut, Scissors } from "lucide-react";

import { AdminNav } from "@/components/features/admin/AdminNav";
import { auth, signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/admin/dashboard");
  }

  const userName = session?.user?.name ?? "Admin";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-surface-2 lg:flex-row">
      <aside className="border-b border-line bg-surface lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-2 border-b border-line px-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-[hsl(var(--surface))]">
            <Scissors className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-bold">
              {userName}
            </div>
            <div className="truncate mono text-[10px] uppercase tracking-wider text-subtle">
              painel admin
            </div>
          </div>
        </div>

        <AdminNav />

        <div className="hidden border-t border-line p-3 lg:block">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-line p-2">
            <span className="avatar-ring">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
                {initials}
              </span>
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-semibold">
                {userName}
              </div>
              <div className="truncate text-[10px] text-subtle">
                {session?.user?.email ?? "—"}
              </div>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
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

      <main className="flex-1">{children}</main>
    </div>
  );
}
