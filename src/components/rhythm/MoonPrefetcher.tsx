import { useEffect } from "react";
import { prefetchMoonMonth, useMoonProvider } from "@/lib/moon-providers";
import { isRhythmForecastEnabled, prefetchMoonSigns } from "@/lib/rhythm-forecast";

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
    if (providerId !== "astro-seek") return;
    // Defer the network prefetch so we don't compete with initial render.
    const t = window.setTimeout(() => {
      void prefetchMoonMonth(new Date(), { neighbors: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [providerId]);
  return null;
}
