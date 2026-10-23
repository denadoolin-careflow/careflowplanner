import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Sprout, Leaf, Heart, Wind } from "lucide-react";
import { LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { phaseSegments } from "@/lib/cosmic/moon-energy";
import { cn } from "@/lib/utils";

export const PHASE_ICONS = { plan: Sprout, grow: Leaf, care: Heart, letgo: Wind } as const;

/** Thin Plan/Grow/Care/Let go ribbon for the next three moon cycles. Tap a segment to jump there. */
export function PhaseRibbon({ selected, rangeStart, rangeEnd, onGoto, className }: {
  selected: Date; rangeStart?: string; rangeEnd?: string; onGoto: (d: Date) => void; className?: string;
}) {
  const todayISO = format(new Date(), "yyyy-MM-dd");
  const segs = useMemo(() => phaseSegments(new Date(), 3), [todayISO]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = segs.reduce((n, s) => n + s.days, 0);
  return (
    <nav aria-label="Moon phases for the next three cycles" className={cn("-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]", className)}>
      <ol className="flex min-w-[880px] lg:min-w-0 gap-0.5">
        {segs.map((s, i) => {
          const Icon = PHASE_ICONS[s.phase];
          const inRange = rangeStart && rangeEnd ? s.end >= rangeStart && s.start <= rangeEnd : false;
          const hasToday = s.start <= todayISO && s.end >= todayISO;
          return (
            <li key={`${s.start}-${i}`} style={{ flexGrow: s.days, flexBasis: 0 }} className="min-w-0">
              <button
                type="button"
                onClick={() => onGoto(parseISO(s.start))}
                title={`${LUNAR_RHYTHM[s.phase].label} · ${format(parseISO(s.start), "MMM d")}–${format(parseISO(s.end), "MMM d")}`}
                aria-label={`${LUNAR_RHYTHM[s.phase].label} from ${format(parseISO(s.start), "MMMM d")} to ${format(parseISO(s.end), "MMMM d")}`}
                className={cn("relative flex h-7 w-full items-center justify-center gap-1 overflow-hidden rounded-md text-[10px] font-semibold transition-opacity hover:opacity-100",
                  inRange ? "opacity-100 ring-1 ring-foreground/30" : "opacity-75")}
                style={{ background: `hsl(var(--rhythm-${s.phase}-tint))`, color: `hsl(var(--rhythm-${s.phase}-deep))` }}
              >
                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                {s.days >= 6 && <span className="truncate">{LUNAR_RHYTHM[s.phase].label} {format(parseISO(s.start), "M/d")}</span>}
                {hasToday && <span aria-label="Today" className="absolute bottom-0 h-1 w-1 rounded-full" style={{ left: `${((Math.round((Date.parse(todayISO) - Date.parse(s.start)) / 864e5) + 0.5) / s.days) * 100}%`, background: `hsl(var(--rhythm-${s.phase}-deep))` }} />}
              </button>
            </li>
          );
        })}
      </ol>
      <span className="sr-only">{total} days</span>
    </nav>
  );
}
