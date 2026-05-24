import { cn } from "@/lib/utils";

type StepIndicatorProps = {
  current: number;
  total: number;
  className?: string;
};

export function StepIndicator({ current, total, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="mono text-[11px] font-medium uppercase tracking-wider text-subtle">
        Passo {current} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const state =
            i + 1 < current ? "done" : i + 1 === current ? "active" : "pending";
          return <span key={i} className="step-dot" data-state={state} />;
        })}
      </div>
    </div>
  );
}
