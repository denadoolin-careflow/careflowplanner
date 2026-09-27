/** Personal, editable step lists for Morning Reset / Evening Reflection, plus per-date check-offs. Device-local. */
import { useEffect, useState } from "react";

export type RitualKind = "morning" | "evening";
export interface RitualStep { id: string; label: string }

const DEFAULTS: Record<RitualKind, string[]> = {
  morning: ["Drink a glass of water", "Take a few slow breaths", "Choose today's top 3"],
  evening: ["Note one thing that went well", "Release what's unfinished", "Set tomorrow's first step"],
};
const stepsKey = (k: RitualKind) => `careflow:ritual-steps:${k}:v1`;
const doneKey = (k: RitualKind, iso: string) => `careflow:ritual-done:${k}:${iso}`;
const EVT = "careflow:ritual-steps";
const uid = () => Math.random().toString(36).slice(2, 10);

export function readSteps(k: RitualKind): RitualStep[] {
  try { const raw = localStorage.getItem(stepsKey(k)); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return DEFAULTS[k].map(label => ({ id: uid(), label }));
}
export function readDone(k: RitualKind, iso: string): string[] {
  try { return JSON.parse(localStorage.getItem(doneKey(k, iso)) ?? "[]"); } catch { return []; }
}
function emit() { window.dispatchEvent(new Event(EVT)); }

export function useRitualSteps(k: RitualKind, iso: string) {
  const [steps, setSteps] = useState<RitualStep[]>(() => readSteps(k));
  const [done, setDone] = useState<string[]>(() => readDone(k, iso));
  useEffect(() => {
    const r = () => { setSteps(readSteps(k)); setDone(readDone(k, iso)); };
    r(); window.addEventListener(EVT, r);
    return () => window.removeEventListener(EVT, r);
  }, [k, iso]);
  const saveSteps = (next: RitualStep[]) => { localStorage.setItem(stepsKey(k), JSON.stringify(next)); emit(); };
  return {
    steps, done,
    add: (label: string) => label.trim() && saveSteps([...steps, { id: uid(), label: label.trim() }]),
    remove: (id: string) => saveSteps(steps.filter(s => s.id !== id)),
    rename: (id: string, label: string) => saveSteps(steps.map(s => s.id === id ? { ...s, label } : s)),
    move: (id: string, dir: -1 | 1) => {
      const i = steps.findIndex(s => s.id === id); const j = i + dir;
      if (i < 0 || j < 0 || j >= steps.length) return;
      const next = [...steps]; [next[i], next[j]] = [next[j], next[i]]; saveSteps(next);
    },
    toggle: (id: string) => {
      const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
      localStorage.setItem(doneKey(k, iso), JSON.stringify(next)); emit();
    },
  };
}
