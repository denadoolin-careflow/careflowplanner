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

/* ---------------- Temperature unit (shared) ---------------- */
export type TempUnit = "C" | "F";
const UNIT_KEY = "careflow:weather:unit";

function readUnit(): TempUnit {
  if (typeof localStorage === "undefined") return "F";
  return (localStorage.getItem(UNIT_KEY) as TempUnit) ?? "F";
}

let currentUnit: TempUnit = readUnit();
const unitListeners = new Set<(u: TempUnit) => void>();

export function getTempUnit(): TempUnit { return currentUnit; }

export function setTempUnit(u: TempUnit) {
  currentUnit = u;
  try { localStorage.setItem(UNIT_KEY, u); } catch { /* noop */ }
  unitListeners.forEach(l => l(u));
}

export function useTempUnit(): [TempUnit, (u: TempUnit) => void] {
  const [u, setU] = useState<TempUnit>(currentUnit);
  useEffect(() => {
    unitListeners.add(setU);
    return () => { unitListeners.delete(setU); };
  }, []);
  return [u, setTempUnit];
}

export const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
export const formatTemp = (c: number, u: TempUnit = currentUnit) =>
  `${u === "F" ? cToF(c) : Math.round(c)}°`;

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