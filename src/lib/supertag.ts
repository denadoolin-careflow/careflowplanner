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

/** True when the tag carries any schema worth surfacing in the UI. */
export function isSupertag(tag: Tag): boolean {
  const d = tag.defaults ?? {};
  return Boolean(
    d.area || d.priority || d.energy || d.estMinutes || d.recurrenceType || (tag.checklist?.length ?? 0) > 0,
  );
}
