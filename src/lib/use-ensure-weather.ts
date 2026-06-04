import { useEffect, useRef } from "react";
import {
  fetchWeather,
  loadSavedPlace,
  reverseLabel,
  savePlace,
  type GeoPlace,
} from "@/lib/weather";
import { getWeatherSnapshot, setWeatherSnapshot } from "@/lib/weather-store";

const REFRESH_MS = 15 * 60 * 1000;
const STALE_MS = 10 * 60 * 1000;

/**
 * Ensures a weather snapshot is loaded into the shared store.
 * Safe to call from any component — no-ops if a snapshot already exists.
 * Mirrors the bootstrap logic in WeatherHeroCard so the rhythm view works
 * standalone without rendering the hero card.
 */
export function useEnsureWeather() {
  const tried = useRef(false);
  useEffect(() => {
    const load = async (place: GeoPlace, persist = false) => {
      try {
        const snap = await fetchWeather(place.lat, place.lon, place.name);
        setWeatherSnapshot(snap);
        if (persist) savePlace(place);
      } catch {
        /* ignore — UI will simply hide weather */
      }
    };

    const refresh = () => {
      const saved = loadSavedPlace();
      const snap = getWeatherSnapshot();
      const place = saved ?? (snap ? { name: snap.locationLabel, lat: snap.lat, lon: snap.lon } : null);
      if (place) void load(place);
    };

    if (!tried.current) {
      tried.current = true;
      if (!getWeatherSnapshot()) {
        const saved = loadSavedPlace();
        if (saved) {
          void load(saved);
        } else if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              const label = await reverseLabel(latitude, longitude);
              await load({ name: label, lat: latitude, lon: longitude }, true);
            },
            () => { /* denied */ },
            { timeout: 6000, maximumAge: 5 * 60 * 1000 },
          );
        }
      }
    }

    const interval = window.setInterval(refresh, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const snap = getWeatherSnapshot();
      if (!snap || Date.now() - new Date(snap.fetchedAt).getTime() > STALE_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}