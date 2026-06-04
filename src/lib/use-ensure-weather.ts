import { useEffect, useRef } from "react";
import {
  fetchWeather,
  loadSavedPlace,
  reverseLabel,
  savePlace,
  type GeoPlace,
} from "@/lib/weather";
import { getWeatherSnapshot, setWeatherSnapshot } from "@/lib/weather-store";

/**
 * Ensures a weather snapshot is loaded into the shared store.
 * Safe to call from any component — no-ops if a snapshot already exists.
 * Mirrors the bootstrap logic in WeatherHeroCard so the rhythm view works
 * standalone without rendering the hero card.
 */
export function useEnsureWeather() {
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    if (getWeatherSnapshot()) return;

    const load = async (place: GeoPlace, persist = false) => {
      try {
        const snap = await fetchWeather(place.lat, place.lon, place.name);
        setWeatherSnapshot(snap);
        if (persist) savePlace(place);
      } catch {
        /* ignore — UI will simply hide weather */
      }
    };

    const saved = loadSavedPlace();
    if (saved) { void load(saved); return; }
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseLabel(latitude, longitude);
        await load({ name: label, lat: latitude, lon: longitude }, true);
      },
      () => { /* user denied — no weather shown */ },
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);
}