"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cake,
  Calendar,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Package,
  Percent,
  Receipt,
  Scissors,
  Settings,
  UserCircle2,
  UserX,
  Users,
  X,
} from "lucide-react";

import { logoutAction } from "@/app/admin/_logout-action";
import { QuickActionsSheet } from "@/components/features/admin/QuickActionsSheet";
import { cn } from "@/lib/utils";

type IconType = typeof Calendar;

type NavItem = {
  href: string;
  label: string;
  Icon: IconType;
};

// PRIMARY agora tem 4 items + 1 FAB no centro (item 3, position 2):
// [Hoje] [Agenda] [➕ FAB] [Comandas] [Mais]
const PRIMARY_LEFT: NavItem[] = [
  { href: "/admin/dashboard", label: "Hoje", Icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", Icon: Calendar },
];
const PRIMARY_RIGHT: NavItem[] = [
  { href: "/admin/comandas", label: "Comandas", Icon: Receipt },
];

const SECONDARY: NavItem[] = [
  { href: "/admin/clientes", label: "Clientes", Icon: UserCircle2 },
  { href: "/admin/clientes/sumidos", label: "Sumidos", Icon: UserX },
  { href: "/admin/aniversariantes", label: "Aniversariantes", Icon: Cake },
  { href: "/admin/servicos", label: "Serviços", Icon: Scissors },
  { href: "/admin/estoque", label: "Estoque", Icon: Package },
  { href: "/admin/profissionais", label: "Profissionais", Icon: Users },
  { href: "/admin/comissoes", label: "Comissões", Icon: Percent },
  { href: "/admin/relatorios", label: "Relatórios", Icon: BarChart3 },
  { href: "/admin/feed", label: "Feed", Icon: ImageIcon },
  { href: "/admin/mensagens", label: "Mensagens", Icon: MessageCircle },
  { href: "/admin/pacotes", label: "Pacotes", Icon: Package },
  { href: "/admin/configuracoes", label: "Configurações", Icon: Settings },
];

export function AdminBottomNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const moreActive = SECONDARY.some((i) => isActive(i.href));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="flex items-end justify-around px-2 py-2">
          {PRIMARY_LEFT.map((item) => (
            <NavTab key={item.href} item={item} active={isActive(item.href)} />
          ))}

          {/* FAB central — botão "+" elevado */}
          <li className="flex flex-1 justify-center">
            <QuickActionsSheet />
          </li>

          {PRIMARY_RIGHT.map((item) => (
            <NavTab key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={cn(
                "tap flex w-full flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                moreActive ? "text-brand" : "text-subtle hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  moreActive ? "bg-brand-soft" : "",
                )}
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </span>
              <span className={cn("font-semibold", moreActive ? "" : "font-medium")}>
                Mais
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="mono text-[10px] uppercase tracking-wider text-subtle">
                  Painel admin
                </div>
                <div className="truncate font-display text-base font-bold">
                  {userName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="grid grid-cols-3 gap-2 p-4">
              {SECONDARY.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "tap flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all",
                        active
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-line bg-surface text-ink hover:-translate-y-px hover:border-brand hover:shadow-sm",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-md",
                          active ? "bg-surface" : "bg-surface-2",
                        )}
                      >
                        <item.Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[11px] font-semibold leading-tight">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-line p-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-subtle transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "tap flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] transition-colors",
          active ? "text-brand" : "text-subtle hover:text-ink",
        )}
      >
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            active ? "bg-brand-soft" : "",
          )}
        >
          <item.Icon className="h-[18px] w-[18px]" />
        </span>
        <span className={cn("font-semibold", active ? "" : "font-medium")}>
          {item.label}
        </span>
      </Link>
    </li>
  );
}
