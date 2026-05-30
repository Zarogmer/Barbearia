import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: { href: string; label: string } | null;
  className?: string;
};

/**
 * Empty state padrão (PBI-27). Tom acolhedor, CTA opcional pra ação
 * de cadastro. Ilustração em SVG inline (ver empty-state-illustrations).
 */
export function EmptyState({
  icon,
  title,
  description,
  cta,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-md border border-dashed border-line bg-surface-2/40 p-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-1 inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand">
          {icon}
        </div>
      )}
      <p className="font-display text-base font-bold">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-subtle">{description}</p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="tap mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-px hover:shadow-lg"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
