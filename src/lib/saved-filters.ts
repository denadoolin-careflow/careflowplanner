import type { FilterState, GroupMode, SortMode, SortDir } from "./task-grouping";

/** A persisted "view" — combines filter, sort, and grouping under a friendly name. */
export interface SavedFilter {
  id: string;
  name: string;
  icon?: string;          // lucide icon name (rendered by SavedFiltersBar)
  filter: FilterState;
  sort?: SortMode;
  sortDir?: SortDir;
  group?: GroupMode;
  builtin?: boolean;
}

/** Built-in smart views shown ahead of user-saved filters. */
export const BUILTIN_FILTERS: SavedFilter[] = [
  { id: "today",        name: "Today",         icon: "Sun",        filter: { dueRange: "today" },                sort: "priority", sortDir: "asc", group: "none",   builtin: true },
  { id: "evening",      name: "This Evening",  icon: "Moon",       filter: { dueRange: "today" },                sort: "priority", sortDir: "asc", group: "dayPart",builtin: true },
  { id: "next7",        name: "Next 7 Days",   icon: "CalendarDays", filter: { dueRange: "week" },               sort: "date",     sortDir: "asc", group: "date",   builtin: true },
  { id: "noDate",       name: "No date",       icon: "Slash",      filter: { dueRange: "none" },                 sort: "created",  sortDir: "desc",group: "none",   builtin: true },
  { id: "highPriority", name: "High priority", icon: "Flag",       filter: { priorities: ["high"] },             sort: "date",     sortDir: "asc", group: "none",   builtin: true },
  { id: "matchEnergy",  name: "Match my energy", icon: "Zap",      filter: { matchEnergy: true },                sort: "priority", sortDir: "asc", group: "none",   builtin: true },
];

const storageKey = (pageId: string) => `lovable.savedFilters.${pageId}`;

export function loadSavedFilters(pageId: string): SavedFilter[] {
  try {
    const raw = localStorage.getItem(storageKey(pageId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveSavedFilters(pageId: string, list: SavedFilter[]): void {
  try { localStorage.setItem(storageKey(pageId), JSON.stringify(list)); } catch { /* noop */ }
}

export function addSavedFilter(pageId: string, f: Omit<SavedFilter, "id" | "builtin">): SavedFilter {
  const item: SavedFilter = { ...f, id: `sf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  const next = [...loadSavedFilters(pageId), item];
  saveSavedFilters(pageId, next);
  return item;
}

export function removeSavedFilter(pageId: string, id: string): void {
  saveSavedFilters(pageId, loadSavedFilters(pageId).filter(f => f.id !== id));
}

/** Active-filter signature for marking which preset is currently in effect. */
export function filterFingerprint(f: FilterState): string {
  const norm = {
    areas: [...(f.areas ?? [])].sort(),
    projectIds: [...(f.projectIds ?? [])].sort(),
    priorities: [...(f.priorities ?? [])].sort(),
    tags: [...(f.tags ?? [])].sort(),
    goalIds: [...(f.goalIds ?? [])].sort(),
    dueRange: f.dueRange ?? "any",
    matchEnergy: !!f.matchEnergy,
  };
  return JSON.stringify(norm);
}