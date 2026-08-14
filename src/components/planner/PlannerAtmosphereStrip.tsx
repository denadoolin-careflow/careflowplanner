import { useMemo } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon as MoonIcon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SLOTS = [
  { key: "morning", part: "Morning" },
  { key: "afternoon", part: "Afternoon" },
  { key: "evening", part: "Evening" },
] as const;

function ConditionIcon({ condition, isNight, className }: { condition: WeatherCondition; isNight?: boolean; className?: string }) {
  const cls = cn("h-3.5 w-3.5", className);
  if (condition === "clear") return isNight ? <MoonIcon className={cls} /> : <Sun className={cls} />;
  if (condition === "partly-cloudy") return <CloudSun className={cls} />;
  if (condition === "cloudy") return <Cloud className={cls} />;
  if (condition === "fog") return <CloudFog className={cls} />;
  if (condition === "drizzle") return <CloudDrizzle className={cls} />;
  if (condition === "rain") return <CloudRain className={cls} />;
  if (condition === "snow") return <CloudSnow className={cls} />;
  if (condition === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

/**
 * One calm line for the day's atmosphere: current conditions, the moon glyph
 * and a cycle dot. Tap for the full per-day-part breakdown.
 */
export function PlannerAtmosphereStrip({ date, className }: { date: Date; className?: string }) {
  useEnsureWeather();
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const { periods, settings } = useCycle();

  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const illum = getIllumination(date);

  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const temp = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;
  const now = snap && snap.conditionLabel !== "—" ? snap : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Day conditions — weather, moon and cycle"
          className={cn(
            "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/40 bg-card/60 px-3 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-card",
            className,
          )}
        >
          {now && (
            <>
              <ConditionIcon condition={now.condition} />
              <span className="font-medium tabular-nums text-foreground">{temp(now.tempC)}</span>
              <span className="truncate">{now.conditionLabel}</span>
              <span aria-hidden className="opacity-40">·</span>
            </>
          )}
          <span aria-hidden className="text-sm leading-none">{moon.glyph}</span>
          <span className="truncate">{moon.label}</span>
          {cycle && (
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: `hsl(var(${cycle.tokenVar}))` }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2 p-3 text-[12px]">
        <div className="space-y-1">
          {SLOTS.map(({ key, part }) => {
            const dp = snap?.dayParts.find(p => p.part === part);
            const has = !!dp && dp.conditionLabel !== "—";
            return (
              <div key={key} className="flex items-center gap-2">
                {has ? <ConditionIcon condition={dp!.condition} isNight={dp!.isNight} /> : <Cloud className="h-3.5 w-3.5 opacity-40" />}
                <span className="w-20 text-muted-foreground">{part}</span>
                <span className="font-medium tabular-nums">{has ? temp(dp!.avgTempC) : "—"}</span>
                <span className="min-w-0 truncate text-muted-foreground">{has ? dp!.conditionLabel : ""}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border/40 pt-2 text-muted-foreground">
          <span aria-hidden className="mr-1.5">{moon.glyph}</span>
          {moon.label} · {illum}% illuminated
        </div>
        {cycle && (
          <div className="text-muted-foreground">
            <span aria-hidden className="mr-1.5">{cycle.glyph}</span>
            {PHASE_META[cycle.phase]?.label ?? cycle.label} · day {cycle.cycleDay}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}