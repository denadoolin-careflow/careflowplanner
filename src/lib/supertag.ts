/**
 * Supertags: tags that carry defaults + a checklist template.
 * When an item is created with a supertag, the tag's defaults fill in any
 * field the user didn't set, and the checklist becomes child tasks.
 */
import type { Tag } from "./tags";

export interface SupertagPatch {
  area?: string;
  priority?: string;
  energy?: string;
  estMinutes?: number;
  recurrenceType?: string;
  recurrenceInterval?: number;
}

/** Tags (from the cache) matching a list of tag name strings. */
export function matchTags(tags: Tag[], names?: string[] | null): Tag[] {
  if (!names?.length || !tags.length) return [];
  const wanted = new Set(names.map(n => String(n).toLowerCase()));
  return tags.filter(t => wanted.has(t.name.toLowerCase()));
}

/**
 * Merge defaults from every matching supertag. Earlier tags win, and any
 * value already present on the item always wins over a tag default.
 */
export function supertagPatch(
  tags: Tag[],
  names: string[] | null | undefined,
  current: Record<string, unknown>,
): SupertagPatch {
  const patch: SupertagPatch = {};
  for (const tag of matchTags(tags, names)) {
    const d = tag.defaults ?? {};
    if (d.area && !current.area && !patch.area) patch.area = d.area;
    if (d.priority && !current.priority && !patch.priority) patch.priority = d.priority;
    if (d.energy && !current.energy && !patch.energy) patch.energy = d.energy;
    if (d.estMinutes && !current.estMinutes && !patch.estMinutes) patch.estMinutes = d.estMinutes;
    if (d.recurrenceType && !current.recurrenceType && !patch.recurrenceType) {
      patch.recurrenceType = d.recurrenceType;
      patch.recurrenceInterval = d.recurrenceInterval ?? 1;
    }
  }
  return patch;
}

/** Checklist lines contributed by the matching supertags, de-duplicated. */
export function supertagChecklist(tags: Tag[], names: string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of matchTags(tags, names)) {
    for (const line of tag.checklist ?? []) {
      const t = line.trim();
      if (!t || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Non-task entities                                                   */
/* ------------------------------------------------------------------ */

/** Area name → habit category, so a tag default can steer a new habit. */
const AREA_TO_HABIT_CATEGORY: Record<string, string> = {
  health: "health",
  home: "home",
  family: "family",
  care: "caregiving",
  caregiving: "caregiving",
  personal: "self-care",
  "self-care": "self-care",
  creative: "creative",
  spiritual: "spiritual",
};

/** Defaults a supertag contributes to a new habit. */
export function supertagHabitPatch(
  tags: Tag[],
  names: string[] | null | undefined,
  current: Record<string, unknown>,
): { category?: string; timesOfDay?: string[] } {
  const patch: { category?: string; timesOfDay?: string[] } = {};
  for (const tag of matchTags(tags, names)) {
    const d = tag.defaults ?? {};
    if (!current.category && !patch.category && d.area) {
      const mapped = AREA_TO_HABIT_CATEGORY[String(d.area).toLowerCase()];
      if (mapped) patch.category = mapped;
    }
  }
  return patch;
}

/** Defaults a supertag contributes to a new appointment. */
export function supertagAppointmentPatch(
  tags: Tag[],
  names: string[] | null | undefined,
  current: Record<string, unknown>,
): { areaName?: string; color?: string; endTime?: string } {
  const patch: { areaName?: string; color?: string; endTime?: string } = {};
  for (const tag of matchTags(tags, names)) {
    const d = tag.defaults ?? {};
    if (d.area && !current.areaName && !patch.areaName) patch.areaName = d.area;
    if (tag.color && !current.color && !patch.color) patch.color = tag.color;
    if (d.estMinutes && !current.endTime && !patch.endTime && typeof current.time === "string" && current.time) {
      patch.endTime = addMinutes(current.time as string, d.estMinutes);
    }
  }
  return patch;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** True when the tag carries any schema worth surfacing in the UI. */
export function isSupertag(tag: Tag): boolean {
  const d = tag.defaults ?? {};
  return Boolean(
    d.area || d.priority || d.energy || d.estMinutes || d.recurrenceType || (tag.checklist?.length ?? 0) > 0,
  );
}
