import { useMemo, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Droplets, Moon as MoonIcon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF, dayPartSuggestion } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { getMoonSign } from "@/lib/planner/moon-journal-prompt";
import { elementTheme } from "@/lib/planner/element-theme";

const PARTS = ["Morning", "Afternoon", "Evening"] as const;

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
 * Interactive weather strip: tap a day part to see its detail and precipitation.
 * Colors are drawn from the day's zodiac element.
 */
export function PlannerWeatherStrip({ element, className }: { element?: "Fire" | "Earth" | "Air" | "Water"; className?: string }) {
  useEnsureWeather();
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const [selected, setSelected] = useState<string | null>(null);

  const theme = elementTheme(element);
  const temp = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;

  const parts = useMemo(
    () => PARTS.map(p => snap?.dayParts.find(dp => dp.part === p)).filter(Boolean),
    [snap],
  );

  if (!snap || parts.length === 0) return null;

  const active = parts.find(p => p!.part === selected) ?? null;

  return (
    <section
      className={cn("rounded-xl border p-2", className)}
      style={{ borderColor: theme.border, backgroundImage: theme.gradient }}
      aria-label="Weather through the day"
    >
      <div className="grid grid-cols-3 gap-1.5">
        {parts.map(dp => {
          const p = dp!;
          const on = selected === p.part;
          return (
            <button
              key={p.part}
              type="button"
              aria-pressed={on}
              aria-label={`${p.part}: ${p.conditionLabel}, ${temp(p.avgTempC)}, ${p.precipChance}% chance of precipitation`}
              onClick={() => setSelected(on ? null : p.part)}
              className={cn(
                "min-w-0 rounded-lg border px-2 py-1.5 text-left transition-colors",
                on ? "shadow-sm" : "border-transparent hover:bg-background/40",
              )}
              style={on ? { borderColor: theme.border, background: theme.soft } : undefined}
            >
              <span className="flex items-center gap-1.5">
                <ConditionIcon condition={p.condition} isNight={p.isNight} className="shrink-0" />
                <span className="truncate text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">{p.part}</span>
              </span>
              <span className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: theme.color }}>{temp(p.avgTempC)}</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
                  <Droplets className="h-2.5 w-2.5" />{p.precipChance}%
                </span>
              </span>
              <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{ width: `${Math.max(2, Math.min(100, p.precipChance))}%`, background: theme.color }}
                />
              </span>
            </button>
          );
        })}
      </div>
      {active && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{active.part}</span> · {active.conditionLabel}
          {dayPartSuggestion(active) ? ` — ${dayPartSuggestion(active)}` : ""}
        </p>
      )}
    </section>
  );
}

export { getMoonSign };
