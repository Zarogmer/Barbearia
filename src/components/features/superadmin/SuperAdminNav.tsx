"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CreditCard, LayoutDashboard, Store } from "lucide-react";

const NAV = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/lojas", label: "Lojas", icon: Store },
  { href: "/superadmin/faturamento", label: "Faturamento", icon: CreditCard },
  { href: "/superadmin/auditoria", label: "Auditoria", icon: ClipboardList },
];

export function SuperAdminNav() {
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
