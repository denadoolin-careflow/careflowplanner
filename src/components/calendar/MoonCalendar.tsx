import { eachDayOfInterval, startOfMonth, startOfWeek, addDays, isSameMonth, isSameDay, format } from "date-fns";
import { cn } from "@/lib/utils";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import type { Element } from "@/lib/rhythm-forecast";

// Element → swatch color. Matches the Rhythm Forecast scheme:
// earth=green, water=blue, air=yellow, fire=orange.
const ELEMENT_STYLE: Record<Element, { bg: string; ring: string; dot: string; label: string }> = {
  earth: { bg: "bg-emerald-500/15", ring: "ring-emerald-500/40", dot: "bg-emerald-500", label: "Earth" },
  water: { bg: "bg-sky-500/15",     ring: "ring-sky-500/40",     dot: "bg-sky-500",     label: "Water" },
  air:   { bg: "bg-yellow-400/20",  ring: "ring-yellow-500/40",  dot: "bg-yellow-500",  label: "Air"   },
  fire:  { bg: "bg-orange-500/15",  ring: "ring-orange-500/40",  dot: "bg-orange-500",  label: "Fire"  },
};

export function MoonCalendar({ cursor }: { cursor: Date }) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="font-medium uppercase tracking-wider">Elements:</span>
        {(Object.keys(ELEMENT_STYLE) as Element[]).map(el => (
          <span key={el} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", ELEMENT_STYLE[el].dot)} />
            {ELEMENT_STYLE[el].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-2 py-1 text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const inMonth = isSameMonth(d, cursor);
          const today = isSameDay(d, new Date());
          const f = getRhythmForecast(d);
          const style = ELEMENT_STYLE[f.element];
          return (
            <div
              key={d.toISOString()}
              title={`${format(d, "EEE MMM d")} · ${f.phaseLabel} · Moon in ${f.sign.sign} (${style.label})`}
              className={cn(
                "relative flex min-h-24 flex-col rounded-lg border p-2 text-xs transition-all duration-200 ease-out",
                inMonth ? cn("border-border/60", style.bg, "ring-1 ring-inset", style.ring) : "border-transparent bg-transparent opacity-40",
                today && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("h-2 w-2 rounded-full", style.dot)} aria-hidden />
                <span className={cn("text-[11px] font-medium", today && "text-primary")}>{format(d, "d")}</span>
              </div>
              <div className="mt-1 flex flex-1 flex-col items-center justify-center gap-0.5 text-center leading-tight">
                <div className="text-xl" aria-hidden>{f.glyph}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-foreground/80">
                  {f.phaseLabel}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  <span aria-hidden>{f.sign.glyph}</span> {f.sign.sign}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}