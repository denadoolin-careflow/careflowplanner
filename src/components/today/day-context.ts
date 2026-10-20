import { useEffect, useMemo, useState } from "react";
import { getMoonPhase, MOON_RITUALS } from "@/lib/astro-suite/lunar";
import { getMoonSign } from "@/lib/zodiac";
import { LUNAR_RHYTHM, lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import { seasonFor, SEASON_META } from "@/lib/seasons/season-utils";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";

export const RHYTHM_ORDER = ["plan", "grow", "care", "letgo"] as const;

/** Phase-scoped colors (phase-specific UI only). */
export const phaseStyle = (p: string) => ({
  light: `hsl(var(--rhythm-${p}))`,
  tint: `hsl(var(--rhythm-${p}-tint))`,
  deep: `hsl(var(--rhythm-${p}-deep))`,
});

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useDayContext(now: Date) {
  const { settings, periods } = useCycle();
  const dayKey = now.toDateString();
  const sky = useMemo(() => {
    const moon = getMoonPhase(now);
    const ritual = MOON_RITUALS[moon];
    let sign: string | null = null;
    try { sign = getMoonSign(now).name; } catch { sign = null; }
    const season = SEASON_META[seasonFor(now)];
    const rhythm = lunarRhythmAt(now);
    return { moonLabel: ritual.label, glyph: ritual.glyph, affirmation: ritual.affirmation, sign, season, rhythm, rhythmLabel: LUNAR_RHYTHM[rhythm].label };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);
  const cycle = useMemo(
    () => (settings.enabled ? getPhaseInfo(now, periods, settings) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayKey, settings, periods],
  );
  return { ...sky, cycleLabel: cycle?.label ?? null, cycleGlyph: cycle?.glyph ?? null };
}
