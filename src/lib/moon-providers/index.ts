/**
 * Moon data provider abstraction.
 *
 * Swap implementations without touching widgets / Today / Week.
 * Today we ship a `local` provider (synodic-cycle math).
 * The `astro-seek` provider is a placeholder you can wire to a real
 * Astro-Seek scrape / edge function later — it falls back to `local`
 * until then, so nothing breaks in the meantime.
 */
import { useEffect, useState } from "react";
import {
  getMoonPhase as localPhase,
  getIllumination as localIllum,
  MOON_INFO,
  type MoonPhase,
} from "@/lib/moon";
import { supabase } from "@/integrations/supabase/client";

export interface MoonData {
  date: Date;
  phase: MoonPhase;
  label: string;
  glyph: string;
  illumination: number;   // 0..100
  source: MoonProviderId; // who computed it
  sign?: string;          // zodiac sign, when provided by the source
}

export interface MoonProvider {
  id: MoonProviderId;
  label: string;
  description: string;
  /** Sync providers are easiest — return data immediately. */
  get(date: Date): MoonData;
}

export type MoonProviderId = "local" | "astro-seek";

const localProvider: MoonProvider = {
  id: "local",
  label: "Local calculation",
  description: "Built-in synodic-cycle math. No network.",
  get(date) {
    const phase = localPhase(date);
    return {
      date,
      phase,
      label: MOON_INFO[phase].label,
      glyph: MOON_INFO[phase].glyph,
      illumination: localIllum(date),
      source: "local",
    };
  },
};

/* ---------- Astro-Seek provider ---------- */
/**
 * Fetches moon phase + sign per day from astro-seek.com via the
 * `astro-seek-moon` edge function. Results are cached per-day in
 * localStorage; `get()` stays synchronous and falls back to the
 * local calculation until the month's data has loaded, then dispatches
 * `moon-data:updated` so subscribers can re-render.
 */
interface AstroDay { phase: MoonPhase; sign: string }
const CACHE_KEY = "careflow:astro-seek:cache";
const dayCache = new Map<string, AstroDay>();
const pendingMonths = new Set<string>();
let cacheLoaded = false;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ensureCacheLoaded() {
  if (cacheLoaded || typeof window === "undefined") return;
  cacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, AstroDay>;
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.phase === "string") dayCache.set(k, v);
    }
  } catch { /* ignore */ }
}
function persistCache() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, AstroDay> = {};
    dayCache.forEach((v, k) => { obj[k] = v; });
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch { /* ignore quota */ }
}
async function fetchMonth(d: Date) {
  const mk = monthKey(d);
  if (pendingMonths.has(mk)) return;
  pendingMonths.add(mk);
  try {
    const { data, error } = await supabase.functions.invoke("astro-seek-moon", {
      body: { month: d.getMonth() + 1, year: d.getFullYear() },
    });
    if (error) throw error;
    const days = (data as { data?: Record<string, AstroDay> } | null)?.data ?? {};
    let added = 0;
    for (const [k, v] of Object.entries(days)) {
      if (v && typeof v.phase === "string") { dayCache.set(k, v); added++; }
    }
    if (added > 0) {
      persistCache();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("moon-data:updated"));
      }
    }
  } catch (e) {
    console.warn("[astro-seek] fetch failed", e);
  } finally {
    pendingMonths.delete(mk);
  }
}

/**
 * Public prefetch helper — warms the Astro-Seek cache for the given
 * month (and optionally neighbouring months) so week/month views render
 * instantly. Safe to call repeatedly; in-flight + cached months are skipped.
 * No-op when the active provider is `local`.
 */
export async function prefetchMoonMonth(
  date: Date = new Date(),
  opts: { neighbors?: boolean } = { neighbors: true },
): Promise<void> {
  if (typeof window === "undefined") return;
  if (getActiveMoonProviderId() !== "astro-seek") return;
  ensureCacheLoaded();
  const targets: Date[] = [new Date(date.getFullYear(), date.getMonth(), 1)];
  if (opts.neighbors) {
    targets.unshift(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    targets.push(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }
  const jobs: Promise<void>[] = [];
  for (const d of targets) {
    const mk = monthKey(d);
    if (pendingMonths.has(mk)) continue;
    // Skip if we already have at least one day cached for this month
    // (months always come back fully populated).
    let hasAny = false;
    for (const k of dayCache.keys()) { if (k.startsWith(mk)) { hasAny = true; break; } }
    if (hasAny) continue;
    jobs.push(fetchMonth(d));
  }
  await Promise.all(jobs);
}

const astroSeekProvider: MoonProvider = {
  id: "astro-seek",
  label: "Astro-Seek",
  description: "Live moon phase + zodiac sign from astro-seek.com (cached per day).",
  get(date) {
    ensureCacheLoaded();
    const hit = dayCache.get(dayKey(date));
    if (hit) {
      const info = MOON_INFO[hit.phase];
      return {
        date,
        phase: hit.phase,
        label: info.label,
        glyph: info.glyph,
        illumination: localIllum(date), // Astro-Seek doesn't expose a numeric %
        source: "astro-seek",
        sign: hit.sign || undefined,
      };
    }
    if (typeof window !== "undefined") void fetchMonth(date);
    // Fall back to local math while the month loads.
    return { ...localProvider.get(date), source: "astro-seek" };
  },
};

const PROVIDERS: Record<MoonProviderId, MoonProvider> = {
  "local": localProvider,
  "astro-seek": astroSeekProvider,
};

export const MOON_PROVIDERS: MoonProvider[] = [localProvider, astroSeekProvider];

const KEY = "careflow:moon-provider";

export function getActiveMoonProviderId(): MoonProviderId {
  if (typeof window === "undefined") return "local";
  const v = window.localStorage.getItem(KEY);
  return v === "astro-seek" ? "astro-seek" : "local";
}

export function setActiveMoonProviderId(id: MoonProviderId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
  window.dispatchEvent(new Event("moon-provider:change"));
}

export function getActiveMoonProvider(): MoonProvider {
  return PROVIDERS[getActiveMoonProviderId()];
}

/** Public helper — use this everywhere instead of importing `getMoonPhase` directly. */
export function getMoonData(date: Date = new Date()): MoonData {
  return getActiveMoonProvider().get(date);
}

export function useMoonProvider(): [MoonProviderId, (id: MoonProviderId) => void] {
  const [id, setId] = useState<MoonProviderId>(getActiveMoonProviderId);
  useEffect(() => {
    const h = () => setId(getActiveMoonProviderId());
    window.addEventListener("storage", h);
    window.addEventListener("moon-provider:change", h);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("moon-provider:change", h);
    };
  }, []);
  const set = (next: MoonProviderId) => { setActiveMoonProviderId(next); setId(next); };
  return [id, set];
}

/**
 * Bumps when remote moon data is loaded/updated (e.g. after Astro-Seek
 * resolves). Call inside a component that reads `getMoonData` /
 * `getRhythmForecast` to make it re-render once real data arrives.
 */
export function useMoonDataVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = () => setV((x) => x + 1);
    window.addEventListener("moon-data:updated", h);
    window.addEventListener("moon-provider:change", h);
    return () => {
      window.removeEventListener("moon-data:updated", h);
      window.removeEventListener("moon-provider:change", h);
    };
  }, []);
  return v;
}
