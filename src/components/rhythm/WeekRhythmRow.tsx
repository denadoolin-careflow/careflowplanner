import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getRhythmForecast, useRhythmForecastEnabled, ELEMENT_META } from "@/lib/rhythm-forecast";
import { prefetchMoonMonth, useMoonDataVersion } from "@/lib/moon-providers";

interface Props {
  weekStart: Date;
  selectedDate?: Date;
  onSelectDay?: (d: Date) => void;
  onLunarOpen?: (d: Date) => void;
  className?: string;
}

/**
 * Rhythm row that aligns column-for-column with <TimeGrid /> beneath it
 * (56px time-axis gutter + 7 equal day columns). Shows moon glyph, phase
 * label, zodiac sign, and element tint per day. The moon glyph + date are
 * clickable links to the Today page; tapping the cell selects that day.
 */
export function WeekRhythmRow({ weekStart, selectedDate, onSelectDay, onLunarOpen, className }: Props) {
  const [on] = useRhythmForecastEnabled();
  useMoonDataVersion();
  const navigate = useNavigate();
  useEffect(() => { void prefetchMoonMonth(weekStart, { neighbors: true }); }, [weekStart]);
  if (!on) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="relative flex" style={{ minWidth: `${7 * 140 + 56}px` }}>
        <div className="w-14 shrink-0 border-r border-border/50 px-1 py-1.5 text-right">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground leading-tight">
            Rhythm
          </p>
        </div>
        <div className="grid flex-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {days.map((d) => {
            const f = getRhythmForecast(d);
            const meta = ELEMENT_META[f.element];
            const isToday = isSameDay(d, today);
            const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
            const iso = format(d, "yyyy-MM-dd");
            const openLunar = (e: React.MouseEvent | React.KeyboardEvent) => {
              e.stopPropagation();
              if (onLunarOpen) onLunarOpen(d);
              else navigate(`/today?date=${iso}`);
            };
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => onSelectDay?.(d)}
                className={cn(
                  "group relative flex flex-col items-center gap-0.5 border-r border-border/50 px-1 py-1.5 text-center transition-colors last:border-r-0",
                  meta.accent.bg,
                  "hover:brightness-105",
                  isSelected && "ring-2 ring-inset ring-primary/70",
                  isToday && !isSelected && "ring-1 ring-inset ring-primary/40",
                )}
                aria-label={`${format(d, "EEEE")} — ${f.phaseLabel} in ${f.sign.sign}`}
              >
                <span
                  role="link"
                  tabIndex={0}
                  onClick={openLunar}
                  onKeyDown={(e) => { if (e.key === "Enter") openLunar(e); }}
                  className="cursor-pointer rounded px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-primary hover:underline"
                  title={`Plan with ${format(d, "EEE MMM d")}`}
                >
                  {format(d, "EEE d")}
                </span>
                <span
                  role="link"
                  tabIndex={0}
                  onClick={openLunar}
                  onKeyDown={(e) => { if (e.key === "Enter") openLunar(e); }}
                  className="cursor-pointer rounded transition-transform hover:scale-110"
                  title={`${f.phaseLabel} in ${f.sign.sign} — plan with this day`}
                >
                  <MoonGlyph date={d} size={22} />
                </span>
                <span className="line-clamp-1 text-[9.5px] font-medium text-foreground/80">
                  {f.phaseLabel}
                </span>
                <span className={cn("inline-flex items-center gap-0.5 text-[10px]", meta.accent.text)}>
                  <span aria-hidden className="leading-none">{f.sign.glyph}</span>
                  <span className="font-medium">{f.sign.sign}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}