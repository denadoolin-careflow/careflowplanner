import { useEffect } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getRhythmForecast, useRhythmForecastEnabled } from "@/lib/rhythm-forecast";
import { prefetchMoonMonth, useMoonDataVersion } from "@/lib/moon-providers";

interface Props {
  weekStart: Date;
  onDayClick?: (d: Date) => void;
  className?: string;
}

/**
 * Compact 7-day Rhythm Forecast preview for the Week view.
 * Each day shows: weekday, moon glyph, phase short label, 2 energy keywords.
 * Hidden entirely when the Rhythm Forecast setting is off.
 */
export function WeekRhythmStrip({ weekStart, onDayClick, className }: Props) {
  const [on] = useRhythmForecastEnabled();
  useMoonDataVersion();
  useEffect(() => {
    // Warm cache for the visible week's month (and neighbors) so
    // navigating across month boundaries is also instant.
    void prefetchMoonMonth(weekStart, { neighbors: true });
  }, [weekStart]);
  if (!on) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <section
      aria-label="Week rhythm forecast"
      className={cn(
        "cozy-card relative overflow-hidden p-4",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/90",
        className,
      )}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Rhythm Forecast · this week
        </p>
        <p className="text-[11px] text-muted-foreground">Plan gently — small counts.</p>
      </div>

      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const f = getRhythmForecast(d);
          const isToday = isSameDay(d, today);
          return (
            <li key={d.toISOString()}>
              <button
                type="button"
                onClick={() => onDayClick?.(d)}
                className={cn(
                  "group flex w-full flex-col items-center gap-1 rounded-xl border border-border/50 bg-background/60 p-2 text-center transition-colors",
                  "hover:bg-primary-soft/40",
                  isToday && "ring-1 ring-primary/60 bg-primary-soft/30",
                )}
              >
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {format(d, "EEE")}
                </span>
                <span className="font-display text-sm tabular-nums leading-none">
                  {format(d, "d")}
                </span>
                <MoonGlyph date={d} size={26} />
                <span className="line-clamp-1 text-[10px] font-medium text-foreground/80">
                  {f.guidance.short.replace(/Moon$/, "").trim() || f.phaseLabel}
                </span>
                <span className="line-clamp-2 text-[9.5px] leading-snug text-muted-foreground">
                  {f.guidance.keywords.slice(0, 2).join(" · ")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
