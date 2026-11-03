import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { cn } from "@/lib/utils";
import { dayMoon } from "./day-moon";

const NAME = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" } as const;

/** The day's moon + Moon-phase pill, identical in every schedule style and the classic week. */
export function ScheduleDayMoon({ date, compact, stacked, className }: { date: Date; compact?: boolean; stacked?: boolean; className?: string }) {
  const m = dayMoon(date);
  const Icon = PHASE_ICONS[m.rhythm];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", stacked && "max-w-full flex-col gap-1", className)} title={`${m.label} · ${NAME[m.rhythm]}`}>
      <span
        className={cn("shrink-0 rounded-full", m.turning && "ring-2 ring-offset-1 ring-offset-card")}
        style={m.turning ? ({ "--tw-ring-color": `hsl(var(--rhythm-${m.rhythm}))` } as React.CSSProperties) : undefined}
      >
        <MoonGlyph date={date} size={compact ? 18 : 22} />
      </span>
      <span
        className={cn("inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-tight", stacked && "max-w-full rounded-xl text-center")}
        style={{ background: `hsl(var(--rhythm-${m.rhythm}-tint))`, color: `hsl(var(--rhythm-${m.rhythm}-deep))` }}
      >
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className={cn(stacked ? "whitespace-normal break-words" : compact ? "sr-only sm:not-sr-only sm:truncate" : "truncate")}>{m.label}</span>
      </span>
    </span>
  );
}
