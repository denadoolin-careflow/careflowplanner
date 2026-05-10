import { useEffect, useState } from "react";
import { loadSavedPlace, mapWmoCode, reverseLabel, savePlace, type GeoPlace, type WeatherCondition } from "./weather";

export interface DailyForecast {
  date: string;            // YYYY-MM-DD
  highC: number;
  lowC: number;
  condition: WeatherCondition;
  label: string;
  precip: number;
}

export type WeekStatus = "loading" | "ready" | "error" | "needs-location";

let cache: { place: GeoPlace; days: DailyForecast[]; fetchedAt: number } | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

async function fetchForecast(p: GeoPlace): Promise<DailyForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(p.lat));
  url.searchParams.set("longitude", String(p.lon));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "10");
  const res = await fetch(url.toString());
  const data = await res.json();
  const times: string[] = data?.daily?.time ?? [];
  return times.map((t, i) => {
    const m = mapWmoCode(data.daily.weather_code[i]);
    return {
      date: t,
      highC: Math.round(data.daily.temperature_2m_max[i]),
      lowC: Math.round(data.daily.temperature_2m_min[i]),
      condition: m.condition,
      label: m.label,
      precip: Math.round(data.daily.precipitation_probability_max[i] ?? 0),
    };
  });
}

export function useWeekForecast() {
  const [, setTick] = useState(0);
  const [status, setStatus] = useState<WeekStatus>(cache ? "ready" : "loading");
  const [place, setPlace] = useState<GeoPlace | null>(cache?.place ?? null);
  const [days, setDays] = useState<DailyForecast[] | null>(cache?.days ?? null);

  useEffect(() => {
    const fn = () => {
      setPlace(cache?.place ?? null);
      setDays(cache?.days ?? null);
      setStatus(cache ? "ready" : "loading");
      setTick(x => x + 1);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  useEffect(() => {
    if (cache && Date.now() - cache.fetchedAt < 30 * 60 * 1000) return;

    const run = async (p: GeoPlace) => {
      try {
        const d = await fetchForecast(p);
        cache = { place: p, days: d, fetchedAt: Date.now() };
        setPlace(p); setDays(d); setStatus("ready");
        notify();
      } catch {
        setStatus("error");
      }
    };

    const saved = loadSavedPlace();
    if (saved) { void run(saved); return; }
    if (!("geolocation" in navigator)) { setStatus("needs-location"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const label = await reverseLabel(pos.coords.latitude, pos.coords.longitude);
          const p: GeoPlace = { name: label, lat: pos.coords.latitude, lon: pos.coords.longitude };
          savePlace(p);
          await run(p);
        } catch { setStatus("needs-location"); }
      },
      () => setStatus("needs-location"),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  return { days, place, status };
}
