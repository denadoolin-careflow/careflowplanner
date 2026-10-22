import { MOON_RITUALS } from "@/lib/astro-suite/lunar";
import { SEASON_META } from "@/lib/seasons/season-utils";
import { RHYTHM_PROP_IDS } from "./rhythm-properties";
import type { Note } from "@/lib/notes";

export type RhythmField = "moonSign" | "moonPhase" | "season" | "cycle";

export const RHYTHM_FIELDS: { id: RhythmField; label: string; propId: string; propName: string; order: string[] }[] = [
  { id: "moonSign", label: "Moon sign", propId: RHYTHM_PROP_IDS.moonSign, propName: "Moon sign",
    order: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] },
  { id: "moonPhase", label: "Moon phase", propId: RHYTHM_PROP_IDS.moonPhase, propName: "Moon phase",
    order: Object.values(MOON_RITUALS).map(m => m.label) },
  { id: "season", label: "Season", propId: RHYTHM_PROP_IDS.season, propName: "Season",
    order: Object.values(SEASON_META).map(s => s.label) },
  { id: "cycle", label: "Cycle phase", propId: RHYTHM_PROP_IDS.cycle, propName: "Cycle phase",
    order: ["Menstrual", "Follicular", "Ovulatory", "Luteal"] },
];

export const NO_VALUE = "Not set";

export interface RhythmViewState {
  group: RhythmField | null;
  sort: RhythmField | null;
  filters: Partial<Record<RhythmField, string[]>>;
}
export const EMPTY_RHYTHM_VIEW: RhythmViewState = { group: null, sort: null, filters: {} };

const fieldOf = (f: RhythmField) => RHYTHM_FIELDS.find(x => x.id === f)!;

/** A note's value for a rhythm field (by stable id, falling back to property name). */
export function rhythmValue(note: Pick<Note, "properties">, f: RhythmField): string | null {
  const def = fieldOf(f);
  const props = note.properties ?? [];
  const p = props.find(x => x.id === def.propId) ?? props.find(x => x.name?.trim().toLowerCase() === def.propName.toLowerCase());
  const v = p?.value;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

const rank = (f: RhythmField, v: string | null) => {
  if (!v) return 999;
  const i = fieldOf(f).order.findIndex(o => o.toLowerCase() === v.toLowerCase());
  return i < 0 ? 500 : i;
};

export function compareRhythm(f: RhythmField, a: string | null, b: string | null): number {
  return rank(f, a) - rank(f, b) || (a ?? "").localeCompare(b ?? "");
}

/** Filter (AND across fields, OR within a field), then stable-sort by the chosen field. */
export function applyRhythmView<T extends Pick<Note, "properties">>(notes: T[], s: RhythmViewState): T[] {
  let out = notes.filter(n => Object.entries(s.filters).every(([f, vals]) => {
    if (!vals?.length) return true;
    const v = rhythmValue(n, f as RhythmField) ?? NO_VALUE;
    return vals.some(x => x.toLowerCase() === v.toLowerCase());
  }));
  if (s.sort) out = [...out].sort((a, b) => compareRhythm(s.sort!, rhythmValue(a, s.sort!), rhythmValue(b, s.sort!)));
  return out;
}

/** Groups in natural order (signs zodiac order, phases lunar order); "Not set" last. */
export function groupByRhythm<T extends Pick<Note, "properties">>(notes: T[], f: RhythmField): { key: string; notes: T[] }[] {
  const m = new Map<string, T[]>();
  for (const n of notes) {
    const k = rhythmValue(n, f) ?? NO_VALUE;
    m.set(k, [...(m.get(k) ?? []), n]);
  }
  return [...m.entries()]
    .sort(([a], [b]) => compareRhythm(f, a === NO_VALUE ? null : a, b === NO_VALUE ? null : b))
    .map(([key, notes]) => ({ key, notes }));
}

/** Values present across notes, for filter choices. */
export function rhythmOptions(notes: Pick<Note, "properties">[], f: RhythmField): string[] {
  const set = new Set<string>();
  for (const n of notes) set.add(rhythmValue(n, f) ?? NO_VALUE);
  return [...set].sort((a, b) => compareRhythm(f, a === NO_VALUE ? null : a, b === NO_VALUE ? null : b));
}

export const activeRhythmCount = (s: RhythmViewState) =>
  (s.group ? 1 : 0) + (s.sort ? 1 : 0) + Object.values(s.filters).filter(v => v?.length).length;
