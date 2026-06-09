import { useEffect, useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { AffirmationHeader } from "@/components/today/AffirmationHeader";
import { AtmosphereChip } from "@/components/calendar/CalendarHeroChips";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { useTodayView, TODAY_VIEW_LABELS, type TodayView } from "@/lib/today-view";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";

interface Props {
  date: Date;
  onDateChange: (d: Date) => void;
  isReallyToday: boolean;
}

/**
 * Calm hero header for the Daily Rhythm Today view.
 * Greeting + date + atmosphere + affirmation in a soft botanical card.
 */
export function RhythmHeader({ date, onDateChange, isReallyToday }: Props) {
  const { state } = useStore();
  const [view, setView] = useTodayView();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const tempStr = snap
    ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°`
    : null;

  const moon = MOON_INFO[getMoonPhase(date)];

  const { periods, settings } = useCycle();
  const cyclePhase = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  return (
    <div className="cozy-card overflow-hidden">
      <div className="relative gradient-calm px-4 py-4 sm:px-7 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 85% 20%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 70% at 10% 100%, hsl(var(--accent)/0.15), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                {personalGreeting(state.settings.name)}
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[11px] text-foreground/80 backdrop-blur">
                <Clock className="h-3 w-3 text-primary" />
                <span className="tabular-nums">{format(now, "h:mm a")}</span>
                {tempStr && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">{tempStr}</span>
                    {snap?.conditionLabel && (
                      <span className="hidden text-muted-foreground sm:inline">
                        {snap.conditionLabel}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <h1 className="font-display text-2xl font-semibold leading-none text-foreground sm:text-4xl">
              Today
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {format(date, "EEEE, MMMM d, yyyy")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[10px] text-foreground/80 backdrop-blur"
                title={moon.invitation}
              >
                <span aria-hidden>{moon.glyph}</span>
                <span>{moon.label}</span>
              </span>
              {cyclePhase && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[10px] text-foreground/80 backdrop-blur"
                  title={PHASE_META[cyclePhase.phase].invitation}
                >
                  <span aria-hidden>{PHASE_META[cyclePhase.phase].glyph}</span>
                  <span>Cycle day {cyclePhase.cycleDay} · {PHASE_META[cyclePhase.phase].label}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AtmosphereChip />
            <div className="inline-flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => onDateChange(addDays(date, -1))}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <DayPickerButton date={date} onChange={onDateChange} />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => onDateChange(addDays(date, 1))}
                aria-label="Next day"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              {!isReallyToday && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-full px-2 text-xs"
                  onClick={() => onDateChange(new Date())}
                >
                  Today
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Plan with
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px]">
              {(Object.keys(TODAY_VIEW_LABELS) as TodayView[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition-colors",
                    view === k
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TODAY_VIEW_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <AffirmationHeader date={date} className="max-w-2xl" />
        </div>
      </div>
    </div>
  );
}