/**
 * Low-energy presets for the planner sidebar.
 *
 * On a hard day you don't want the whole list — you want the three or four
 * things that actually keep the house and the people going. This picks those
 * "essentials" out of a chore list and remembers the toggle per section.
 */
import { useCallback, useState } from "react";

export type LowEnergySection = "cleaning" | "caretaking";

const KEY = (s: LowEnergySection) => `careflow:planner:low-energy:${s}`;

/** How many rows a low-energy list shows at most. */
export const LOW_ENERGY_LIMIT = 5;

/** Chores that keep a household breathing — always essential. */
const ESSENTIAL_WORDS = [
  "dish", "trash", "garbage", "laundry", "litter", "feed", "pet", "dog", "cat",
  "med", "pill", "prescription", "refill", "water", "bath", "shower", "toilet",
  "diaper", "bed", "wipe", "counter", "sink", "meal", "lunch", "dinner",
  "breakfast", "appointment", "check in", "check-in", "call",
];

const HEAVY_WORDS = [
  "deep clean", "declutter", "organize", "reorganize", "purge", "scrub",
  "shampoo", "wash windows", "baseboard", "closet", "garage", "attic",
  "basement", "sort", "donate", "paint", "seasonal",
];

const DAILY_CADENCES = ["daily", "every day", "each day"];

export interface LowEnergyCandidate {
  title: string;
  done: boolean;
  cadence?: string | null;
  /** Optional planned minutes — short chores win. */
  minutes?: number | null;
}

function score(item: LowEnergyCandidate): number {
  const t = item.title.toLowerCase();
  let s = 0;
  if (DAILY_CADENCES.includes((item.cadence ?? "").toLowerCase())) s += 3;
  if (ESSENTIAL_WORDS.some(w => t.includes(w))) s += 2;
  if (HEAVY_WORDS.some(w => t.includes(w))) s -= 4;
  if ((item.minutes ?? 0) > 0 && (item.minutes ?? 0) <= 15) s += 1;
  if ((item.minutes ?? 0) >= 60) s -= 2;
  if (t.split(/\s+/).length <= 4) s += 1;
  return s;
}

/** True when a chore belongs in the low-energy shortlist. */
export function isLowEnergyEssential(item: LowEnergyCandidate): boolean {
  return !item.done && score(item) > 0;
}

/**
 * Filter a list down to its essentials, best-first. Falls back to the
 * shortest undone chores so the preset is never empty when work exists.
 */
export function pickLowEnergy<T extends LowEnergyCandidate>(items: T[], limit = LOW_ENERGY_LIMIT): T[] {
  const open = items.filter(i => !i.done);
  const ranked = open
    .map(i => ({ i, s: score(i) }))
    .sort((a, b) => b.s - a.s);
  const strong = ranked.filter(r => r.s > 0);
  return (strong.length ? strong : ranked).slice(0, limit).map(r => r.i);
}

/** Persisted per-section low-energy toggle. */
export function useLowEnergyMode(section: LowEnergySection) {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEY(section)) === "1";
  });
  const toggle = useCallback(() => {
    setOn(prev => {
      const next = !prev;
      try { window.localStorage.setItem(KEY(section), next ? "1" : "0"); } catch { /* private mode */ }
      return next;
    });
  }, [section]);
  return { lowEnergy: on, toggleLowEnergy: toggle };
}
