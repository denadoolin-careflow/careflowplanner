import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Sparkles, Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Sun, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import type { WeatherCondition } from "@/lib/weather";
import { pickAffirmation } from "@/lib/affirmations";

function CondIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-3.5 w-3.5", className);
  if (c === "clear") return <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

/**
 * Compact strip for the date hero: live time, weather glance, moon phase
 * and a tappable affirmation.
 */
export function DateBarStrip({ date, className }: { date: Date; className?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const iso = date.toISOString().slice(0, 10);
  const day = days?.find(x => x.date === iso);
  const moon = MOON_INFO[getMoonPhase(date)];
  const illum = getIllumination(date);
  const fmtTemp = (c: number) => `${unit === "F" ? cToF(c) : c}°`;

  const [affirmation, setAffirmation] = useState(() => pickAffirmation());
  const refresh = () => setAffirmation(pickAffirmation());

  const time = useMemo(() => format(now, "h:mm a"), [now]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
      {/* Live time */}
      <div className="flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 tabular-nums font-sans">
        <span className="text-foreground/85">{time}</span>
      </div>

      {/* Weather */}
      {day && (
        <div className="flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1">
          <CondIcon c={day.condition} className="text-secondary-foreground" />
          <span className="font-semibold tabular-nums text-foreground/85">{fmtTemp(day.highC)}</span>
          <span className="tabular-nums opacity-60">/ {fmtTemp(day.lowC)}</span>
          {day.precip >= 25 && <span className="text-primary tabular-nums">{day.precip}%</span>}
        </div>
      )}

      {/* Moon */}
      <div className="flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1" title={moon.invitation}>
        <span aria-hidden>{moon.glyph}</span>
        <span className="text-foreground/85">{moon.label}</span>
        <span className="opacity-60 tabular-nums">{illum}%</span>
      </div>

      {/* Affirmation */}
      <button
        type="button"
        onClick={refresh}
        className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary transition-colors hover:bg-primary/15"
        title="Tap for another"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="italic">{affirmation}</span>
        <RefreshCw className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
      </button>
    </div>
  );
}