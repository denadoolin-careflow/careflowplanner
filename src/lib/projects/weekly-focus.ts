import { format } from "date-fns";
import type { Project } from "@/lib/types";

/** ISO week key, e.g. "2026-W45". */
export const weekKey = (d = new Date()) => format(d, "RRRR-'W'II");

/** This week's focus: explicit pick for this week, else favorite, else most recently touched. */
export function pickWeeklyFocus(projects: Project[], lastTouched: (p: Project) => string | undefined, week = weekKey()): Project | undefined {
  const picked = projects.find(p => p.details?.weeklyFocus === week);
  if (picked) return picked;
  const fav = projects.find(p => p.isFavorite);
  if (fav) return fav;
  return [...projects].sort((a, b) => (lastTouched(b) ?? "").localeCompare(lastTouched(a) ?? ""))[0];
}

/** Patches that make `id` the only project flagged as this week's focus. */
export function weeklyFocusPatches(projects: Project[], id: string, week = weekKey()): { id: string; details: NonNullable<Project["details"]> }[] {
  const out: { id: string; details: NonNullable<Project["details"]> }[] = [];
  for (const p of projects) {
    if (p.id === id) { if (p.details?.weeklyFocus !== week) out.push({ id: p.id, details: { ...(p.details ?? {}), weeklyFocus: week } }); }
    else if (p.details?.weeklyFocus) { const { weeklyFocus: _w, ...rest } = p.details; out.push({ id: p.id, details: rest }); }
  }
  return out;
}
