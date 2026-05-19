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

export interface MoonData {
  date: Date;
  phase: MoonPhase;
  label: string;
  glyph: string;
  illumination: number;   // 0..100
  source: MoonProviderId; // who computed it
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

/**
 * Stub. Today this just delegates to the local provider so the UI
 * stays consistent. When you're ready, replace `get` with a fetch
 * to your Astro-Seek edge function / cached table — same shape.
 */
const astroSeekProvider: MoonProvider = {
  id: "astro-seek",
  label: "Astro-Seek (coming soon)",
  description: "Will pull moon phase + sign from Astro-Seek. Falls back to local for now.",
  get(date) {
    // TODO: replace with real Astro-Seek lookup; keep MoonData shape unchanged.
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
