import { useEffect } from "react";
import { prefetchMoonMonth, useMoonProvider } from "@/lib/moon-providers";
import { isRhythmForecastEnabled } from "@/lib/rhythm-forecast";

/**
 * Background prefetch for Astro-Seek moon data. Warms prev/current/next
 * months on mount and whenever the provider changes, so Week and Month
 * views render instantly without flashing fallback data.
 */
export function MoonPrefetcher() {
  const [providerId] = useMoonProvider();
  useEffect(() => {
    if (!isRhythmForecastEnabled()) return;
    if (providerId !== "astro-seek") return;
    // Defer slightly so we don't compete with initial render.
    const t = window.setTimeout(() => {
      void prefetchMoonMonth(new Date(), { neighbors: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [providerId]);
  return null;
}
