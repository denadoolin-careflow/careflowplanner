import type { Energy, Task } from "./types";

/**
 * Heuristic energy inference based on the task title (and notes).
 * Returns undefined when no rule matches so the caller can decide
 * whether to leave the field empty or apply a fallback.
 */
const HIGH = [
  "workout","gym","run","clean","scrub","mow","yard","laundry",
  "move ","lift","repair","fix ","build","assemble","paint",
  "deep clean","reorganize","declutter","wash car","groom",
  "shovel","rake","garage","heavy",
];
const MEDIUM = [
  "call","email","reply","schedule","plan","review","book ",
  "appointment","errand","shop","pick up","drop off","pay ",
  "bill","grocer","cook","prep","meal","drive","appt",
];
const LOW = [
  "read","journal","reflect","meditate","stretch","rest","nap",
  "watch","listen","sip","water plants","tidy","sort","skim",
  "breathe","gratitude","write a note","check in","self care",
  "self-care",
];

function match(hay: string, words: string[]): boolean {
  for (const w of words) if (hay.includes(w)) return true;
  return false;
}

export function inferEnergyFromTitle(title: string, notes?: string): Energy | undefined {
  const hay = ` ${(title || "").toLowerCase()} ${(notes || "").toLowerCase()} `;
  if (match(hay, HIGH)) return "high";
  if (match(hay, LOW)) return "low";
  if (match(hay, MEDIUM)) return "medium";
  return undefined;
}

export function energyBucket(t: Pick<Task, "energy" | "title" | "notes">): Energy | "unset" {
  return (t.energy as Energy | undefined) ?? inferEnergyFromTitle(t.title, t.notes) ?? "unset";
}

export const ENERGY_META: Record<Energy | "unset", { label: string; emoji: string; tint: string; ring: string }> = {
  high:   { label: "High energy",   emoji: "🔥", tint: "bg-rose-500/10 text-rose-500",     ring: "ring-rose-500/30" },
  medium: { label: "Medium energy", emoji: "⚡", tint: "bg-amber-500/10 text-amber-500",   ring: "ring-amber-500/30" },
  low:    { label: "Low energy",    emoji: "🌱", tint: "bg-emerald-500/10 text-emerald-500", ring: "ring-emerald-500/30" },
  unset:  { label: "Unsorted",      emoji: "·",  tint: "bg-muted text-muted-foreground",  ring: "ring-border" },
};