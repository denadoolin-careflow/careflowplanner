import { useEffect, useState } from "react";

/** User-tunable thresholds + alert toggles for weather guidance. */
export interface WeatherPrefs {
  /** Below this (in °C) we suggest a warm coat. */
  coldC: number;
  /** At/above this (in °C) we suggest light clothes + water. */
  hotC: number;
  rainAlerts: boolean;
  snowAlerts: boolean;
  windAlerts: boolean;
  /** Auto-detect location on first load. */
  autoLocate: boolean;
}

export const DEFAULT_WEATHER_PREFS: WeatherPrefs = {
  coldC: 15, // ~60°F
  hotC: 27,  // ~80°F
  rainAlerts: true,
  snowAlerts: true,
  windAlerts: false,
  autoLocate: true,
};

const KEY = "careflow:weather-prefs:v1";
const listeners = new Set<(p: WeatherPrefs) => void>();

function read(): WeatherPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_WEATHER_PREFS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_WEATHER_PREFS };
    return { ...DEFAULT_WEATHER_PREFS, ...(JSON.parse(raw) as Partial<WeatherPrefs>) };
  } catch { return { ...DEFAULT_WEATHER_PREFS }; }
}

let current: WeatherPrefs = read();

export function getWeatherPrefs(): WeatherPrefs { return current; }

export function setWeatherPrefs(patch: Partial<WeatherPrefs>) {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  listeners.forEach(l => l(current));
}

export function useWeatherPrefs(): [WeatherPrefs, (p: Partial<WeatherPrefs>) => void] {
  const [p, setP] = useState<WeatherPrefs>(current);
  useEffect(() => {
    listeners.add(setP);
    return () => { listeners.delete(setP); };
  }, []);
  return [p, setWeatherPrefs];
}