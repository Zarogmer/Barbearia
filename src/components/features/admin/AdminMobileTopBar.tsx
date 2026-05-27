import { Scissors } from "lucide-react";

type Props = {
  userName: string;
};

export function AdminMobileTopBar({ userName }: Props) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-[hsl(var(--surface))]">
          <Scissors className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate font-display text-sm font-bold">{userName}</div>
          <div className="mono text-[10px] uppercase tracking-wider text-subtle">
            painel admin
          </div>
        </div>
      </div>
      <span className="avatar-ring shrink-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold">
          {initials}
        </span>
      </span>
    </header>
  );
}
