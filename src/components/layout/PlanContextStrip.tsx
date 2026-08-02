import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, CloudSun, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { cn } from "@/lib/utils";

/**
 * One slim contextual row shared by Week and Month, replacing the old
 * ScopeHero / PlanningHero stack: greeting, clock, weather, an optional
 * moon-rhythm chip and page links. PlanHeader owns the title and date nav.
 */
export function PlanContextStrip({
  date, showRhythm = false, actions, className,
}: {
  date: Date;
  showRhythm?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;
  const rhythm = showRhythm ? getRhythmForecast(date) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-border/50 bg-card/60 px-3 py-2 text-[12px] text-foreground/80 shadow-soft backdrop-blur-sm",
        className,
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{personalGreeting(state.settings.name)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="tabular-nums">{format(now, "h:mm a")}</span>
      </span>
      {tempStr && (
        <span className="inline-flex items-center gap-1.5">
          <CloudSun className="h-3.5 w-3.5 text-primary" />
          <span className="tabular-nums">{tempStr}</span>
          {snap?.conditionLabel && <span className="text-muted-foreground">{snap.conditionLabel}</span>}
        </span>
      )}
      {rhythm && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="text-sm leading-none">{rhythm.glyph}</span>
          <span>{rhythm.phaseLabel} · {rhythm.sign.sign}</span>
        </span>
      )}
      {actions && <span className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</span>}
    </div>
  );
}