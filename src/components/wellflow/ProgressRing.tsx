import { cn } from "@/lib/utils";

/** Calm circular progress indicator. Sage fill, gold as the goal nears. */
export function ProgressRing({
  label, value, goal, unit = "", size = 84, className,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit?: string;
  size?: number;
  className?: string;
}) {
  const pct = goal && goal > 0 ? Math.min(value / goal, 1) : 0;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const near = pct >= 0.85;
  const fmt = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString();

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img"
             aria-label={`${label}: ${fmt(value)}${unit}${goal ? ` of ${fmt(goal)}${unit}` : ""}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                  className="stroke-muted" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            className={cn("transition-all duration-500", near ? "stroke-accent" : "stroke-primary")}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center leading-tight">
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmt(value)}</div>
            {goal ? (
              <div className="text-[10px] text-muted-foreground tabular-nums">/ {fmt(goal)}{unit}</div>
            ) : (
              <div className="text-[10px] text-muted-foreground">no goal</div>
            )}
          </div>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
