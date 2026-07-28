import { useMemo } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon as MoonIcon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";

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
 * Compact planner header strip: per-day-part weather plus moon and cycle phase,
 * so the grid always shows the day's conditions at a glance.
 */
export function PlannerAtmosphereStrip({ date, className }: { date: Date; className?: string }) {
  useEnsureWeather();
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const { periods, settings } = useCycle();

  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const illum = Math.round(getIllumination(date) * 100);

  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const chip = "flex min-w-0 items-center gap-1.5 rounded-full border border-border/40 bg-card/70 px-2.5 py-1 text-[11px]";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {SLOTS.map(({ key, part }) => {
        const dp = snap?.dayParts.find(p => p.part === part);
        const has = !!dp && dp.conditionLabel !== "—";
        return (
          <div key={key} className={chip} title={has ? `${part}: ${dp!.conditionLabel}` : `${part}: weather unavailable`}>
            {has ? <ConditionIcon condition={dp!.condition} isNight={dp!.isNight} /> : <Cloud className="h-3.5 w-3.5 opacity-40" />}
            <span className="text-muted-foreground">{part.slice(0, 3)}</span>
            {has && (
              <span className="font-medium tabular-nums">
                {unit === "F" ? cToF(dp!.avgTempC) : Math.round(dp!.avgTempC)}°
              </span>
            )}
          </div>
        );
      })}

      <div className={chip} title={`${moon.label} · ${illum}% illuminated`}>
        <span aria-hidden>{moon.glyph}</span>
        <span className="truncate text-muted-foreground">{moon.label}</span>
      </div>

      {cycle && (
        <div className={chip} title={`Cycle day ${cycle.cycleDay} · ${PHASE_META[cycle.phase].label ?? cycle.label}`}>
          <span aria-hidden>{cycle.glyph}</span>
          <span className="truncate text-muted-foreground">{cycle.label}</span>
          <span className="tabular-nums text-muted-foreground/70">d{cycle.cycleDay}</span>
        </div>
      )}
    </div>
  );
}