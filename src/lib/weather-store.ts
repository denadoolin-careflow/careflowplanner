import { useEffect, useState } from "react";
import type { WeatherSnapshot, DayPartForecast, DayPartKey } from "./weather";

let current: WeatherSnapshot | null = null;
const listeners = new Set<(s: WeatherSnapshot | null) => void>();

export function setWeatherSnapshot(s: WeatherSnapshot | null) {
  current = s;
  listeners.forEach(l => l(s));
}

export function getWeatherSnapshot(): WeatherSnapshot | null {
  return current;
}

export function useWeatherSnapshot(): WeatherSnapshot | null {
  const [snap, setSnap] = useState<WeatherSnapshot | null>(current);
  useEffect(() => {
    listeners.add(setSnap);
    return () => { listeners.delete(setSnap); };
  }, []);
  return snap;
}

/** Soft, caregiver-toned suggestion for a specific day part. */
export function dayPartSuggestion(dp: DayPartForecast | undefined): string | null {
  if (!dp || dp.conditionLabel === "—") return null;
  const tips: string[] = [];

  if (dp.precipChance >= 60) tips.push("grab an umbrella");
  else if (dp.precipChance >= 35) tips.push("umbrella, just in case");

  const t = dp.avgTempC;
  if (t <= 0) tips.push("bundle up — hat and gloves");
  else if (t <= 8) tips.push("a warm coat and layers");
  else if (t <= 14) tips.push("bring a light layer");
  else if (t >= 30) tips.push("water bottle and shade");
  else if (t >= 25) tips.push("light clothes, sip water");

  if (dp.condition === "thunderstorm") tips.push("plan indoor errands");
  if (dp.condition === "snow") tips.push("warm boots and slow steps");
  if (dp.condition === "fog") tips.push("headlights on if driving");
  if (dp.condition === "clear" && !dp.isNight && (dp.part === "Morning" || dp.part === "Afternoon")) tips.push("a few minutes of sunlight will land");

  if (tips.length === 0) {
    if (dp.part === "Late Night") return "soft lights, slow pace";
    if (dp.part === "Evening") return "an easy wind-down";
    return "a gentle pace works";
  }
  // Capitalize first letter
  const joined = tips.slice(0, 2).join(" · ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export type { DayPartKey };