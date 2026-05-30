"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, History, Image as ImageIcon, User } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  label: string;
  href: string;
  Icon: typeof Calendar;
};

type Props = {
  orgSlug: string;
};

export function CustomerBottomNav({ orgSlug }: Props) {
  const pathname = usePathname();
  const base = `/${orgSlug}/conta`;

  const items: NavItem[] = [
    { key: "agendar", label: "Agendar", href: `/${orgSlug}/agendar`, Icon: Calendar },
    { key: "historico", label: "Histórico", href: `${base}/historico`, Icon: History },
    { key: "feed", label: "Feed", href: `${base}/feed`, Icon: ImageIcon },
    { key: "perfil", label: "Perfil", href: `${base}/perfil`, Icon: User },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2 sm:max-w-2xl">
        {items.map(({ key, label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
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
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className={cn("font-semibold", active ? "" : "font-medium")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
