/**
 * Past-days comparison: overlay a previous stretch of days (a lunar cycle ago,
 * a cycle-length ago, or a custom offset) on top of the current window.
 */
import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { useRhythmSeries, type RhythmDay } from "@/lib/planner/time-allocation";
import { useCycle } from "@/lib/cycle-store";

export type CompareMode = "off" | "lunar" | "cycle" | "prev";

export const COMPARE_OPTIONS: { id: CompareMode; label: string; hint: string }[] = [
  { id: "off", label: "Off", hint: "Just this stretch" },
  { id: "lunar", label: "Last moon", hint: "One lunar cycle back (29.5 days)" },
  { id: "cycle", label: "Last cycle", hint: "One of your cycle lengths back" },
  { id: "prev", label: "Previous", hint: "The window immediately before this one" },
];

export const LUNAR_DAYS = 29.53;

export interface ComparePoint {
  name: string;
  Planned: number;
  Completed: number;
  Energy: number | null;
  PastPlanned: number | null;
  PastCompleted: number | null;
  PastEnergy: number | null;
  pastLabel: string | null;
  moonLabel: string;
  cycleLabel: string | null;
}

export interface CompareResult {
  offsetDays: number;
  pastFrom: Date;
  pastDays: RhythmDay[];
  points: ComparePoint[];
  /** Human summary of the difference, e.g. completion rate delta. */
  summary: string[];
  windowLabel: string;
}

const rate = (xs: RhythmDay[]) => {
  const p = xs.reduce((s, d) => s + d.plannedH, 0);
  return p > 0 ? xs.reduce((s, d) => s + d.doneH, 0) / p : 0;
};
const sum = (xs: RhythmDay[], k: "plannedH" | "doneH") => xs.reduce((s, d) => s + d[k], 0);
const avgEnergy = (xs: RhythmDay[]) => {
  const v = xs.map(d => d.energyScore).filter((n): n is number => n !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Number of days to shift back for a given mode. */
export function compareOffset(mode: CompareMode, days: number, cycleLength: number): number {
  if (mode === "lunar") return Math.round(LUNAR_DAYS);
  if (mode === "cycle") return Math.max(7, Math.round(cycleLength || 28));
  if (mode === "prev") return days;
  return 0;
}

/**
 * Current window plus an aligned past window, merged into one chart series.
 * Always call with a real mode; "off" returns an empty comparison.
 */
export function useCompareSeries(from: Date, days: number, mode: CompareMode): CompareResult {
  const { settings } = useCycle();
  const offsetDays = compareOffset(mode, days, settings?.avgCycleLength ?? 28);
  const pastFrom = useMemo(() => addDays(from, -offsetDays), [from, offsetDays]);

  const current = useRhythmSeries(from, days);
  const past = useRhythmSeries(pastFrom, mode === "off" ? 1 : days);

  return useMemo(() => {
    const pastDays = mode === "off" ? [] : past.days;

    const points: ComparePoint[] = current.days.map((d, i) => {
      const p = pastDays[i] ?? null;
      return {
        name: d.label,
        Planned: d.plannedH,
        Completed: d.doneH,
        Energy: d.energyScore,
        PastPlanned: p ? p.plannedH : null,
        PastCompleted: p ? p.doneH : null,
        PastEnergy: p ? p.energyScore : null,
        pastLabel: p ? `${format(p.date, "MMM d")}${p.moonLabel ? ` · ${p.moonLabel}` : ""}` : null,
        moonLabel: d.moonLabel,
        cycleLabel: d.cycleLabel,
      };
    });

    const summary: string[] = [];
    if (pastDays.length) {
      const rNow = rate(current.days);
      const rPast = rate(pastDays);
      if (rPast > 0 && Math.abs(rNow - rPast) >= 0.08) {
        const delta = Math.round(((rNow - rPast) / rPast) * 100);
        summary.push(delta > 0
          ? `You completed about ${delta}% more of what you planned than in the comparison stretch.`
          : `You completed about ${Math.abs(delta)}% less of what you planned than in the comparison stretch.`);
      }

      const pNow = sum(current.days, "plannedH");
      const pPast = sum(pastDays, "plannedH");
      if (pPast > 0 && Math.abs(pNow - pPast) >= 1) {
        summary.push(`Planned time: ${pNow.toFixed(1)}h now vs ${pPast.toFixed(1)}h then.`);
      }

      const eNow = avgEnergy(current.days);
      const ePast = avgEnergy(pastDays);
      if (eNow !== null && ePast !== null && Math.abs(eNow - ePast) >= 0.25) {
        summary.push(eNow > ePast
          ? `Logged energy is running higher this time (${eNow.toFixed(1)} vs ${ePast.toFixed(1)} out of 3).`
          : `Logged energy is running lower this time (${eNow.toFixed(1)} vs ${ePast.toFixed(1)} out of 3).`);
      }

      if (!summary.length) summary.push("These two stretches look remarkably similar — a steady rhythm.");
    }

    return {
      offsetDays,
      pastFrom,
      pastDays,
      points,
      summary,
      windowLabel: pastDays.length
        ? `${format(pastFrom, "MMM d")} – ${format(addDays(pastFrom, days - 1), "MMM d")}`
        : "",
    };
  }, [current.days, past.days, mode, offsetDays, pastFrom, days]);
}
