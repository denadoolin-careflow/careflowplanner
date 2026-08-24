/**
 * Per-sign customisation of the zodiac season planning guide.
 *
 * The built-in copy is a starting point; every family's month looks different.
 * Overrides are stored locally per solar sign so the guide keeps its shape
 * (theme, element, dates) while the suggestion lists become yours.
 */
import { useCallback, useEffect, useState } from "react";
import type { SolarSeason, ZodiacSign } from "@/lib/planner/solar-season";

export type SeasonListKey = "focus" | "habits" | "meals";

export type SeasonOverride = Partial<Record<SeasonListKey, string[]>>;
export type SeasonOverrides = Partial<Record<ZodiacSign, SeasonOverride>>;

const KEY = "careflow:planner:solar-season-custom";
const EVENT = "careflow:solar-season-custom";

function read(): SeasonOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SeasonOverrides) : {};
  } catch { return {}; }
}

function write(next: SeasonOverrides) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* private mode */ }
}

/** Season with any per-sign customisation applied. */
export function applyOverride(season: SolarSeason, all: SeasonOverrides): SolarSeason {
  const o = all[season.sign];
  if (!o) return season;
  return {
    ...season,
    focus: o.focus ?? season.focus,
    habits: o.habits ?? season.habits,
    meals: o.meals ?? season.meals,
  };
}

export function useSeasonOverrides() {
  const [overrides, setOverrides] = useState<SeasonOverrides>(read);

  useEffect(() => {
    const sync = () => setOverrides(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setList = useCallback((sign: ZodiacSign, key: SeasonListKey, items: string[]) => {
    const next = read();
    next[sign] = { ...(next[sign] ?? {}), [key]: items };
    write(next);
    setOverrides(next);
  }, []);

  const resetSign = useCallback((sign: ZodiacSign) => {
    const next = read();
    delete next[sign];
    write(next);
    setOverrides(next);
  }, []);

  const isCustomised = useCallback(
    (sign: ZodiacSign) => Boolean(overrides[sign] && Object.keys(overrides[sign]!).length),
    [overrides],
  );

  return { overrides, setList, resetSign, isCustomised };
}
