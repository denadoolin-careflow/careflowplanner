import { addDays, format, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import { useTransitsEnabled } from "@/lib/astrology-prefs";
import { getTransitsForDate } from "@/lib/transits";
import { cn } from "@/lib/utils";

interface Props { weekStart: Date; className?: string }

/**
 * Compact strip of transit glyphs per day of the week (ingresses, retrogrades,
 * void-of-course moon). Hidden when astrology or transits are disabled, or
 * when no day in the week has any transit to show — keeps it quiet.
 */
export function WeekTransitStrip({ weekStart, className }: Props) {
  const on = useTransitsEnabled();
  if (!on) return null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const rows = days.map(d => ({ d, transits: getTransitsForDate(d) }));
  const anyTransit = rows.some(r => r.transits.length > 0);
  if (!anyTransit) return null;
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card/50 p-2", className)}>
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Sky notes</p>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {rows.map(({ d, transits }) => {
          const iso = format(d, "yyyy-MM-dd");
          const isToday = isSameDay(d, today);
          return (
            <Link
              key={iso}
              to={`/today?date=${iso}`}
              className={cn(
                "flex min-h-[42px] flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-center transition-colors",
                "hover:bg-primary-soft/50",
                isToday && "bg-primary-soft/40 ring-1 ring-primary/30",
              )}
              title={transits.map(t => t.detail).join(" · ") || `No major transits ${format(d, "EEE MMM d")}`}
            >
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {format(d, "EEE")[0]}
              </span>
              <span className="flex flex-wrap items-center justify-center gap-0.5 text-[11px] leading-none">
                {transits.length === 0 ? (
                  <span className="text-muted-foreground/40">·</span>
                ) : transits.slice(0, 3).map(t => (
                  <span
                    key={t.id}
                    aria-label={t.label}
                    className={cn(
                      "tabular-nums",
                      t.tone === "warn" && "text-amber-600 dark:text-amber-400",
                      t.tone === "rest" && "text-muted-foreground",
                    )}
                  >
                    {t.glyph}
                  </span>
                ))}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}