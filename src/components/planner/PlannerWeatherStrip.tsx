import { useMemo, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Droplets, Moon as MoonIcon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF, dayPartSuggestion } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition, DayPartKey } from "@/lib/weather";
import { elementTheme } from "@/lib/planner/element-theme";

const PARTS = ["Morning", "Afternoon", "Evening"] as const;

const PART_HOURS: Record<string, [number, number]> = {
  Morning: [6, 12],
  Afternoon: [12, 17],
  Evening: [17, 21],
};

const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;

/** Condition-driven hue for hour cells: sunny = yellow, rain = blue, snow = grey-blue, etc. */
const COND_HUE: Record<WeatherCondition, number> = {
  "clear": 45,          // sunny yellow
  "partly-cloudy": 200, // pale sky
  "cloudy": 220,        // soft grey-blue
  "fog": 230,           // muted grey
  "drizzle": 205,       // light blue
  "rain": 212,          // blue
  "snow": 195,          // icy grey-blue
  "thunderstorm": 265,  // violet storm
};
const COND_SAT: Record<WeatherCondition, number> = {
  "clear": 92,
  "partly-cloudy": 55,
  "cloudy": 12,
  "fog": 8,
  "drizzle": 70,
  "rain": 82,
  "snow": 18,
  "thunderstorm": 65,
};

function condTint(condition: WeatherCondition, isNight?: boolean) {
  const h = COND_HUE[condition] ?? 220;
  const s = COND_SAT[condition] ?? 20;
  // Night clear skies read as deep indigo rather than sunshine.
  const hue = condition === "clear" && isNight ? 245 : h;
  const sat = condition === "clear" && isNight ? 45 : s;
  return {
    background: `hsl(${hue} ${sat}% 55% / 0.16)`,
    borderColor: `hsl(${hue} ${sat}% 45% / 0.35)`,
    color: `hsl(${hue} ${Math.min(90, sat + 10)}% 32%)`,
  };
}

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

  const hoursFor = (part: DayPartKey) => {
    const [from, to] = PART_HOURS[part] ?? [0, 24];
    return (snap?.todayHourly ?? []).filter(h => h.hour >= from && h.hour < to);
  };

  if (!snap || parts.length === 0) return null;

  const active = parts.find(p => p!.part === selected) ?? null;
  const activeHours = active ? hoursFor(active.part) : [];

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
              <span className="mt-1 flex h-4 w-full items-end gap-[2px]" aria-hidden>
                {hoursFor(p.part).map(h => (
                  <span
                    key={h.hour}
                    className="flex-1 rounded-sm bg-foreground/10"
                    style={{ height: `${Math.max(12, Math.min(100, h.precipChance))}%`, background: theme.color, opacity: 0.25 + (h.precipChance / 100) * 0.75 }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {active && (
        <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
          {activeHours.map(h => {
            const tint = condTint(h.condition, h.isNight);
            return (
              <div
                key={h.hour}
                className="flex min-w-[46px] flex-1 flex-col items-center gap-0.5 rounded-lg border px-1 py-1 dark:[&_.hour-temp]:brightness-[1.9]"
                style={{ borderColor: tint.borderColor, background: tint.background }}
                title={`${hourLabel(h.hour)} · ${h.conditionLabel} · ${h.precipChance}% precip`}
              >
                <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">{hourLabel(h.hour)}</span>
                <ConditionIcon condition={h.condition} isNight={h.isNight} className="hour-temp" style={{ color: tint.color }} />
                <span className="hour-temp text-[11px] font-semibold tabular-nums" style={{ color: tint.color }}>{temp(h.tempC)}</span>
                <span className="inline-flex items-center gap-0.5 text-[9.5px] tabular-nums text-muted-foreground">
                  <Droplets className="h-2 w-2" />{h.precipChance}%
                </span>
              </div>
            );
          })}
        </div>
      )}
      {active && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{active.part}</span> · {active.conditionLabel}
          {dayPartSuggestion(active) ? ` — ${dayPartSuggestion(active)}` : ""}
        </p>
      )}
    </section>
  );
}

