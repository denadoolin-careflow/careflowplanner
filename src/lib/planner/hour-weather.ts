import type { WeatherCondition, HourlyForecast } from "@/lib/weather";

/** Condition-driven hue for hour cells: sunny = yellow, rain = blue, snow = grey-blue, etc. */
const COND_HUE: Record<WeatherCondition, number> = {
  "clear": 45,
  "partly-cloudy": 200,
  "cloudy": 220,
  "fog": 230,
  "drizzle": 205,
  "rain": 212,
  "snow": 195,
  "thunderstorm": 265,
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

export type CondTint = { background: string; borderColor: string; color: string; wash: string };

/** Shared tint for a condition — used by the weather strip, timeline rail and capacity bar. */
export function condTint(condition: WeatherCondition, isNight?: boolean): CondTint {
  const h = COND_HUE[condition] ?? 220;
  const s = COND_SAT[condition] ?? 20;
  // Night clear skies read as deep indigo rather than sunshine.
  const hue = condition === "clear" && isNight ? 245 : h;
  const sat = condition === "clear" && isNight ? 45 : s;
  return {
    background: `hsl(${hue} ${sat}% 55% / 0.16)`,
    borderColor: `hsl(${hue} ${sat}% 45% / 0.35)`,
    color: `hsl(${hue} ${Math.min(90, sat + 10)}% 32%)`,
    // Very light wash so timeline rows keep tasks as the visual focus.
    wash: `hsl(${hue} ${sat}% 55% / 0.07)`,
  };
}

/** Tint for a specific forecast hour, or null when there is no data. */
export function hourTint(hour: HourlyForecast | undefined): CondTint | null {
  return hour ? condTint(hour.condition, hour.isNight) : null;
}

/** Index today's hourly forecast by hour number for O(1) lookup. */
export function byHour(hours: HourlyForecast[] | undefined): Map<number, HourlyForecast> {
  return new Map((hours ?? []).map(h => [h.hour, h]));
}

/** The condition that best represents a run of hours (most frequent, ties → severest). */
const SEVERITY: WeatherCondition[] = [
  "clear", "partly-cloudy", "cloudy", "fog", "drizzle", "rain", "snow", "thunderstorm",
];

export function dominantCondition(hours: HourlyForecast[]): HourlyForecast | null {
  if (hours.length === 0) return null;
  const counts = new Map<WeatherCondition, number>();
  for (const h of hours) counts.set(h.condition, (counts.get(h.condition) ?? 0) + 1);
  let best = hours[0];
  let bestScore = -1;
  for (const h of hours) {
    const score = (counts.get(h.condition) ?? 0) * 100 + SEVERITY.indexOf(h.condition);
    if (score > bestScore) { bestScore = score; best = h; }
  }
  return best;
}
