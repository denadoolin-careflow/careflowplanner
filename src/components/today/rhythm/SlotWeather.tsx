import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon, Sun, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF, dayPartSuggestion } from "@/lib/weather-store";
import type { WeatherCondition } from "@/lib/weather";

type Slot = "morning" | "afternoon" | "evening";
const SLOT_TO_PART: Record<Slot, "Morning" | "Afternoon" | "Evening"> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening",
};

function ConditionIcon({ condition, isNight, className }: {
  condition: WeatherCondition; isNight?: boolean; className?: string;
}) {
  const cls = cn("h-4 w-4", className);
  if (condition === "clear") return isNight ? <Moon className={cls} /> : <Sun className={cls} />;
  if (condition === "partly-cloudy") return <CloudSun className={cls} />;
  if (condition === "cloudy") return <Cloud className={cls} />;
  if (condition === "fog") return <CloudFog className={cls} />;
  if (condition === "drizzle") return <CloudDrizzle className={cls} />;
  if (condition === "rain") return <CloudRain className={cls} />;
  if (condition === "snow") return <CloudSnow className={cls} />;
  if (condition === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

const fmt = (c: number, u: "C" | "F") => `${u === "F" ? cToF(c) : Math.round(c)}°`;

export function SlotWeather({ slot }: { slot: Slot }) {
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const partKey = SLOT_TO_PART[slot];
  const dp = snap?.dayParts.find(p => p.part === partKey);
  const hasData = !!dp && dp.conditionLabel !== "—";
  const tip = hasData ? dayPartSuggestion(dp) : null;

  return (
    <div className="mx-4 mt-0 mb-3 rounded-2xl border border-border/40 bg-card/70 px-4 py-3 backdrop-blur sm:mx-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-primary">
          {hasData ? (
            <ConditionIcon condition={dp!.condition} isNight={dp!.isNight} className="h-6 w-6" />
          ) : (
            <Cloud className="h-6 w-6 opacity-50" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{partKey}</span>
            {hasData && (
              <span className="font-display text-2xl font-semibold leading-none tabular-nums text-foreground">
                {fmt(dp!.avgTempC, unit)}
              </span>
            )}
            {hasData && (
              <span className="text-xs text-muted-foreground">{dp!.conditionLabel}</span>
            )}
            {!hasData && (
              <span className="text-xs text-muted-foreground">Forecast unavailable</span>
            )}
          </div>
          {hasData && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
              <span>H {fmt(dp!.highC, unit)} · L {fmt(dp!.lowC, unit)}</span>
              {dp!.precipChance >= 10 && <span>💧 {dp!.precipChance}%</span>}
            </div>
          )}
          {tip && (
            <p className="mt-1.5 text-[11px] italic leading-snug text-muted-foreground">{tip}</p>
          )}
        </div>
      </div>
    </div>
  );
}