import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getRhythmForecast, useRhythmForecastEnabled, ELEMENT_META, ELEMENT_LABEL } from "@/lib/rhythm-forecast";
import { prefetchMoonMonth, useMoonDataVersion } from "@/lib/moon-providers";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sparkles, ArrowUpRight } from "lucide-react";

const ELEMENT_VAR: Record<string, string> = {
  fire: "--element-fire",
  earth: "--element-earth",
  air: "--element-air",
  water: "--element-water",
};

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
            const elVar = ELEMENT_VAR[f.element];
            const elementLine = ELEMENT_LABEL[f.element];
            const isToday = isSameDay(d, today);
            const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
            const iso = format(d, "yyyy-MM-dd");
            const openLunar = (e: React.MouseEvent | React.KeyboardEvent) => {
              e.stopPropagation();
              if (onLunarOpen) onLunarOpen(d);
              else navigate(`/today?date=${iso}`);
            };
            return (
              <HoverCard key={d.toISOString()} openDelay={120} closeDelay={80}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectDay?.(d)}
                    className={cn(
                      "group relative flex flex-col items-center gap-0.5 border-r border-border/50 px-1 py-1.5 text-center transition-all last:border-r-0",
                      "hover:brightness-110 hover:-translate-y-px",
                      isSelected && "ring-2 ring-inset ring-primary/70",
                      isToday && !isSelected && "ring-1 ring-inset ring-primary/40",
                    )}
                    style={{
                      background: `linear-gradient(180deg, hsl(var(${elVar}) / 0.22) 0%, hsl(var(${elVar}) / 0.08) 100%)`,
                      borderBottom: `2px solid hsl(var(${elVar}) / 0.55)`,
                    }}
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
                      className="cursor-pointer rounded transition-transform group-hover:scale-110"
                      title={`${f.phaseLabel} in ${f.sign.sign} — plan with this day`}
                    >
                      <MoonGlyph date={d} size={22} />
                    </span>
                    <span className="line-clamp-1 text-[9.5px] font-medium text-foreground/85">
                      {f.phaseLabel}
                    </span>
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color: `hsl(var(${elVar}))` }}
                    >
                      <span aria-hidden className="leading-none">{f.sign.glyph}</span>
                      <span>{f.sign.sign}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 px-0.5 text-[9px] leading-snug text-muted-foreground/90">
                      {f.guidance.keywords.slice(0, 2).join(" · ")}
                    </span>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  side="bottom"
                  align="center"
                  className="w-72 p-0 overflow-hidden border-border/60"
                >
                  <div
                    className="px-3 py-2.5"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(${elVar}) / 0.18), hsl(var(${elVar}) / 0.04))`,
                      borderBottom: `1px solid hsl(var(${elVar}) / 0.35)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <MoonGlyph date={d} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {format(d, "EEEE · MMM d")}
                        </p>
                        <p className="text-sm font-semibold leading-tight">
                          {f.phaseLabel}{" "}
                          <span
                            className="font-normal"
                            style={{ color: `hsl(var(${elVar}))` }}
                          >
                            in {f.sign.glyph} {f.sign.sign}
                          </span>
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: `hsl(var(${elVar}) / 0.18)`,
                          color: `hsl(var(${elVar}))`,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 px-3 py-2.5">
                    <p className="flex items-start gap-1.5 text-[12px] leading-snug text-foreground/90">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{f.guidance.suggestion}</span>
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground italic">
                      {elementLine.line}
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {f.sign.insight}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Do more</p>
                        <ul className="space-y-0.5">
                          {f.guidance.doMore.slice(0, 3).map(t => (
                            <li key={t} className="text-[11px] leading-snug text-foreground/85">· {t}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Do less</p>
                        <ul className="space-y-0.5">
                          {f.guidance.doLess.slice(0, 3).map(t => (
                            <li key={t} className="text-[11px] leading-snug text-foreground/70">· {t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openLunar}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      Plan this day <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}