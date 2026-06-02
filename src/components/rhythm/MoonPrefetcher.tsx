import { useEffect } from "react";
import { prefetchMoonMonth, useMoonProvider } from "@/lib/moon-providers";
import { isRhythmForecastEnabled, prefetchMoonSigns } from "@/lib/rhythm-forecast";
import { getTransitsForDate } from "@/lib/transits";
import { isTransitsEnabled } from "@/lib/astrology-prefs";

/**
 * Background prefetch for moon data. Warms two caches on mount:
 *  1. Local moon-sign math cache (prev/current/next month) — persisted to
 *     localStorage so Today / Week / Month forecasts render instantly even
 *     on first paint after a hard refresh.
 *  2. Astro-Seek provider cache (only when that provider is active).
 */
export function MoonPrefetcher() {
  const [providerId] = useMoonProvider();
  useEffect(() => {
    if (!isRhythmForecastEnabled()) return;
    // Local moon-sign cache is cheap — warm it immediately so the rhythm
    // forecast on every day/month is ready before the user navigates.
    prefetchMoonSigns(new Date(), { neighbors: true });
    // Warm the transit cache for today + neighbours so chips render
    // instantly on first paint.
    if (isTransitsEnabled()) {
      const today = new Date();
      for (let d = -2; d <= 14; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
        getTransitsForDate(day);
      }
    }
    if (providerId !== "astro-seek") return;
    // Defer the network prefetch so we don't compete with initial render.
    const t = window.setTimeout(() => {
      void prefetchMoonMonth(new Date(), { neighbors: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [providerId]);
  return null;
}
