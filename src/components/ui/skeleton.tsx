import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton placeholder com animação shimmer. Usar em loading.tsx das pages
 * pra dar feedback de carregamento. Evita layout shift quando dados chegam.
 */
export function Skeleton({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}
