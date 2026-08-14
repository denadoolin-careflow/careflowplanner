/**
 * Per-day-part self-reported mood, keyed by ISO date + day part.
 * Mirrors `energy-by-part.ts` so the two can be logged side by side.
 */
import { useEffect, useState } from "react";
import type { DayPart } from "@/lib/energy-by-part";

export type Mood = "rough" | "okay" | "good" | "bright";

const KEY = "careflow:mood-by-part";
const EVENT = "careflow:mood-by-part:change";

type Store = Record<string, Partial<Record<DayPart, Mood>>>;

function readAll(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
function writeAll(s: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT));
}

export function getMoodForPart(dateISO: string, part: DayPart): Mood | null {
  return readAll()[dateISO]?.[part] ?? null;
}
export function setMoodForPart(dateISO: string, part: DayPart, m: Mood) {
  const s = readAll();
  s[dateISO] = { ...(s[dateISO] ?? {}), [part]: m };
  writeAll(s);
}

export function useDayPartMood(dateISO: string): [
  Partial<Record<DayPart, Mood>>,
  (part: DayPart, m: Mood) => void,
] {
  const [val, setVal] = useState<Partial<Record<DayPart, Mood>>>(() => readAll()[dateISO] ?? {});
  useEffect(() => {
    const sync = () => setVal(readAll()[dateISO] ?? {});
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [dateISO]);
  return [
    val,
    (part, m) => { setMoodForPart(dateISO, part, m); setVal(v => ({ ...v, [part]: m })); },
  ];
}

export const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: "rough", emoji: "😔", label: "Rough" },
  { id: "okay", emoji: "😐", label: "Okay" },
  { id: "good", emoji: "🙂", label: "Good" },
  { id: "bright", emoji: "😊", label: "Bright" },
];
