import { useCallback, useEffect, useState } from "react";

export type DebriefTone = "gentle" | "encouraging" | "direct" | "cosmic" | "playful";

export const DEBRIEF_TONES: { id: DebriefTone; label: string; hint: string }[] = [
  { id: "gentle",      label: "Gentle",      hint: "Soft, permissive, low-pressure." },
  { id: "encouraging", label: "Encouraging", hint: "Warm cheerleader energy." },
  { id: "direct",      label: "Direct",      hint: "Clear, no fluff." },
  { id: "cosmic",      label: "Cosmic",      hint: "Lean into moon + cycle imagery." },
  { id: "playful",     label: "Playful",     hint: "Light, witty, a little sparkle." },
];

const KEY = "careflow:debrief-tone:v1";
const listeners = new Set<(t: DebriefTone) => void>();

function read(): DebriefTone {
  if (typeof localStorage === "undefined") return "gentle";
  const v = localStorage.getItem(KEY) as DebriefTone | null;
  return v && DEBRIEF_TONES.some(x => x.id === v) ? v : "gentle";
}

export function useDebriefTone(): [DebriefTone, (t: DebriefTone) => void] {
  const [t, setT] = useState<DebriefTone>(read);
  useEffect(() => {
    const fn = (n: DebriefTone) => setT(n);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const set = useCallback((next: DebriefTone) => {
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    listeners.forEach(l => l(next));
  }, []);
  return [t, set];
}

/** Apply tone-specific copy adjustments to a base sentence (used in local fallback). */
export function applyTone(tone: DebriefTone, base: string): string {
  switch (tone) {
    case "encouraging": return base.replace(/\.$/, "") + " — you've got this.";
    case "direct":      return base.replace(/—.*$/, "").trim();
    case "cosmic":      return "✦ " + base;
    case "playful":     return base.replace(/\.$/, "") + " ✨";
    case "gentle":
    default:            return base;
  }
}