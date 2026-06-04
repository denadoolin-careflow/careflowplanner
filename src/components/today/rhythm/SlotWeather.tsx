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
  if (!snap) return null;
  const partKey = SLOT_TO_PART[slot];
  const dp = snap.dayParts.find(p => p.part === partKey);
  if (!dp || dp.conditionLabel === "—") return null;
  const tip = dayPartSuggestion(dp);

  return (
    <div className="mx-4 mt-0 mb-3 flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-[12px] backdrop-blur sm:mx-5">
      <span className="inline-flex items-center gap-1.5 text-foreground/80">
        <ConditionIcon condition={dp.condition} isNight={dp.isNight} />
        <span className="font-display tabular-nums text-base leading-none">{fmt(dp.avgTempC, unit)}</span>
        <span className="text-muted-foreground">{dp.conditionLabel}</span>
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        H {fmt(dp.highC, unit)} · L {fmt(dp.lowC, unit)}
      </span>
      {dp.precipChance >= 10 && (
        <span className="text-[11px] text-muted-foreground">💧 {dp.precipChance}%</span>
      )}
      {tip && (
        <span className="ml-auto min-w-0 max-w-full truncate text-[11px] italic text-muted-foreground sm:max-w-[50%]">{tip}</span>
      )}
    </div>
  );
}