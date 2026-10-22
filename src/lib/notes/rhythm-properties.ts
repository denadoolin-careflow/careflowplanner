import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getMoonPhase, MOON_RITUALS } from "@/lib/astro-suite/lunar";
import { getMoonSign } from "@/lib/zodiac";
import { LUNAR_RHYTHM, lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import { seasonFor, SEASON_META } from "@/lib/seasons/season-utils";
import { getPhaseInfo } from "@/lib/cycle";
import type { CycleSettings, PeriodLog } from "@/lib/cycle";
import type { NoteProperty } from "@/lib/notes";

/** Stable ids so stamps can be refreshed without touching user properties. */
export const RHYTHM_PROP_IDS = {
  moonPhase: "rhythm-moon-phase",
  moonSign: "rhythm-moon-sign",
  rhythm: "rhythm-phase",
  season: "rhythm-season",
  cycle: "rhythm-cycle",
} as const;
export const SUMMARY_PROP_ID = "ai-summary";
const RHYTHM_IDS = new Set<string>(Object.values(RHYTHM_PROP_IDS));
export const isRhythmProp = (p: Pick<NoteProperty, "id">) => RHYTHM_IDS.has(p.id);

export interface CycleInput { settings: CycleSettings; periods: PeriodLog[] }

const sel = (id: string, name: string, v: string | null): NoteProperty | null =>
  v ? { id, name, type: "select", value: v, options: [v] } : null;

/** Rhythm bundle for a date. Cycle phase only when tracking is on and known. */
export function rhythmPropertiesFor(date: Date, cycle?: CycleInput | null): NoteProperty[] {
  let sign: string | null = null;
  try { sign = getMoonSign(date).name; } catch { sign = null; }
  const cyc = cycle?.settings.enabled ? getPhaseInfo(date, cycle.periods, cycle.settings) : null;
  return [
    sel(RHYTHM_PROP_IDS.moonPhase, "Moon phase", MOON_RITUALS[getMoonPhase(date)]?.label ?? null),
    sel(RHYTHM_PROP_IDS.moonSign, "Moon sign", sign),
    sel(RHYTHM_PROP_IDS.rhythm, "Rhythm phase", LUNAR_RHYTHM[lunarRhythmAt(date)].label),
    sel(RHYTHM_PROP_IDS.season, "Season", SEASON_META[seasonFor(date)]?.label ?? null),
    sel(RHYTHM_PROP_IDS.cycle, "Cycle phase", cyc?.label ?? null),
  ].filter(Boolean) as NoteProperty[];
}

/**
 * Merge a rhythm bundle into existing properties. Missing rhythm props are added;
 * with `refresh`, existing rhythm props are updated. Non-rhythm props never change.
 */
export function mergeRhythm(existing: NoteProperty[], bundle: NoteProperty[], refresh = false): NoteProperty[] {
  const byId = new Map(bundle.map(b => [b.id, b]));
  const out = existing.map(p => (refresh && byId.has(p.id) ? byId.get(p.id)! : p));
  for (const b of bundle) if (!existing.some(p => p.id === b.id)) out.push(b);
  return out;
}

export const hasRhythm = (props: NoteProperty[]) => props.some(isRhythmProp);

/** Date a note's rhythm describes: its own date when dated, else now. */
export function rhythmDateFor(noteDate?: string | null, createdAt?: string): Date {
  if (noteDate && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)) return new Date(`${noteDate}T12:00:00`);
  return createdAt ? new Date(createdAt) : new Date();
}

/** Loads the signed-in user's cycle data (null when off/unavailable). */
export async function loadCycleInput(userId: string): Promise<CycleInput | null> {
  try {
    const { data: s } = await supabase.from("cycle_settings").select("*").eq("user_id", userId).maybeSingle();
    if (!s?.enabled) return null;
    const { data: p } = await supabase.from("cycle_logs").select("*").eq("user_id", userId).order("period_start", { ascending: false }).limit(24);
    const settings: CycleSettings = {
      enabled: true,
      avgCycleLength: (s as any).avg_cycle_length ?? 28,
      avgPeriodLength: (s as any).avg_period_length ?? 5,
      lutealLength: (s as any).luteal_length ?? 14,
      showFertility: !!(s as any).show_fertility,
      pairWithMoon: !!(s as any).pair_with_moon,
      moonArchetype: ((s as any).moon_archetype as any) ?? "auto",
      autoLowEnergy: !!(s as any).auto_low_energy,
    };
    const periods: PeriodLog[] = (p ?? []).map((r: any) => ({ id: r.id, periodStart: r.period_start, periodEnd: r.period_end ?? null }));
    return { settings, periods };
  } catch { return null; }
}

/** Bundle for a new note row; never throws. */
export async function stampForNewNote(userId: string, noteDate?: string | null): Promise<NoteProperty[]> {
  try { return rhythmPropertiesFor(rhythmDateFor(noteDate), await loadCycleInput(userId)); } catch { return []; }
}

export const rhythmStampLabel = (d: Date) => format(d, "MMM d, yyyy");
