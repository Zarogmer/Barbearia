"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  Scissors,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", icon: Calendar },
  { href: "/admin/comandas", label: "Comandas", icon: Receipt },
  { href: "/admin/clientes", label: "Clientes", icon: UserCircle2 },
  { href: "/admin/servicos", label: "Serviços", icon: Scissors },
  { href: "/admin/estoque", label: "Estoque", icon: Package },
  { href: "/admin/profissionais", label: "Profissionais", icon: Users },
  { href: "/admin/comissoes", label: "Comissões", icon: Percent },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/feed", label: "Feed", icon: ImageIcon },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:p-3">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "flex items-center gap-2.5 rounded-md bg-brand-soft px-2.5 py-2 text-sm font-semibold text-brand"
                : "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
