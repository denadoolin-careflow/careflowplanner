/**
 * Master astrology gate + sub-toggles. All localStorage-backed.
 *
 * - `astrology` (master): when OFF hides rhythm forecast chips, moon-sign
 *   chips, tarot, transits, lunar journal prompts. Cycle stays.
 * - `transits`: show planet→sign chips, Mercury retrograde, VoC moon.
 * - `tarot`: show daily tarot card + spreads.
 */
import { useEffect, useState } from "react";

const ASTRO_KEY = "careflow:astrology:enabled";
const TRANSITS_KEY = "careflow:astrology:transits";
const TAROT_KEY = "careflow:astrology:tarot";
const EVENT = "careflow:astrology:change";

function read(key: string, fallback = true): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}

function write(key: string, v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, v ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
}

export function isAstrologyEnabled() { return read(ASTRO_KEY, true); }
export function isTransitsEnabled() { return read(TRANSITS_KEY, true) && isAstrologyEnabled(); }
export function isTarotEnabled() { return read(TAROT_KEY, true) && isAstrologyEnabled(); }

function makeHook(key: string, deps: (() => boolean)[] = []) {
  return (): [boolean, (v: boolean) => void] => {
    const get = () => read(key, true) && deps.every(d => d());
    const [on, setOn] = useState<boolean>(get);
    useEffect(() => {
      const h = () => setOn(get());
      window.addEventListener("storage", h);
      window.addEventListener(EVENT, h);
      return () => {
        window.removeEventListener("storage", h);
        window.removeEventListener(EVENT, h);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [on, (v: boolean) => { write(key, v); setOn(get()); }];
  };
}

export const useAstrologyEnabled = makeHook(ASTRO_KEY);
export const useTransitsEnabledPref = makeHook(TRANSITS_KEY);
export const useTarotEnabledPref = makeHook(TAROT_KEY);

/** Combined (master AND sub) — what views should check. */
export function useTransitsEnabled(): boolean {
  const [astro] = useAstrologyEnabled();
  const [tr] = useTransitsEnabledPref();
  return astro && tr;
}

export function useTarotEnabled(): boolean {
  const [astro] = useAstrologyEnabled();
  const [tar] = useTarotEnabledPref();
  return astro && tar;
}