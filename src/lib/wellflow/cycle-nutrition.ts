/**
 * Cycle-aware nourishment notes. Reuses the app's existing cycle engine, so
 * nothing is entered twice. General food ideas only — not medical advice and
 * not a substitute for care from your own clinician.
 */
import { useMemo } from "react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, type CyclePhase, type PhaseInfo } from "@/lib/cycle";
import type { FoodEntry } from "./types";

export interface PhaseNourishment {
  phase: CyclePhase;
  label: string;
  focus: string;
  /** Short list of foods that tend to fit this stretch. */
  foods: string[];
  /** A gentle note about what often helps here. */
  note: string;
}

export const PHASE_NOURISHMENT: Record<CyclePhase, PhaseNourishment> = {
  menstrual: {
    phase: "menstrual",
    label: "Menstrual",
    focus: "Iron-rich and warming",
    foods: ["Lentils", "Beef or turkey", "Spinach", "Beets", "Bone broth", "Dark chocolate", "Oats", "Ginger tea"],
    note: "Warm, cooked food and steady iron sources tend to feel kindest on bleeding days. Extra water helps too.",
  },
  follicular: {
    phase: "follicular",
    label: "Follicular",
    focus: "Fresh, light, and protein-forward",
    foods: ["Eggs", "Greek yogurt", "Leafy salads", "Citrus", "Sprouts", "Fermented foods", "Chicken", "Berries"],
    note: "Energy usually climbs here. Lighter, fresher meals with solid protein often sit well.",
  },
  ovulatory: {
    phase: "ovulatory",
    label: "Ovulatory",
    focus: "Fiber and antioxidants",
    foods: ["Cruciferous vegetables", "Quinoa", "Salmon", "Berries", "Avocado", "Almonds", "Bell peppers"],
    note: "Fiber-rich plants and healthy fats support this peak stretch. Keep hydration up if you're active.",
  },
  luteal: {
    phase: "luteal",
    label: "Luteal",
    focus: "Magnesium and steady carbs",
    foods: ["Sweet potato", "Pumpkin seeds", "Dark leafy greens", "Bananas", "Brown rice", "Dark chocolate", "Chickpeas", "Salmon"],
    note: "Cravings and appetite often rise here. Steady complex carbs with protein tend to smooth the dips.",
  },
};

export interface CycleNutritionContext {
  enabled: boolean;
  info: PhaseInfo | null;
  nourishment: PhaseNourishment | null;
}

/** Current cycle phase plus its nourishment focus, or disabled state. */
export function useCycleNutrition(date = new Date()): CycleNutritionContext {
  const { settings, periods, loaded } = useCycle();
  return useMemo(() => {
    if (!loaded || !settings.enabled) return { enabled: false, info: null, nourishment: null };
    const info = getPhaseInfo(date, periods, settings);
    return {
      enabled: true,
      info,
      nourishment: info ? PHASE_NOURISHMENT[info.phase] : null,
    };
    // date is a Date object; key off its day so we don't rerun every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settings, periods, date.toDateString()]);
}

/* --------------------------------------------------- phase x nutrition */

export interface PhaseAverages {
  phase: CyclePhase;
  label: string;
  days: number;
  avgCalories: number;
  avgProtein: number;
  avgWater: number;
}

/** Average intake per cycle phase over the entries provided. */
export function averagesByPhase(
  entries: Pick<FoodEntry, "date" | "calories" | "protein">[],
  waterByDate: Record<string, number>,
  phaseForDate: (iso: string) => CyclePhase | null,
): PhaseAverages[] {
  const byPhase = new Map<CyclePhase, { days: Set<string>; cal: number; pro: number; water: number }>();

  const bucket = (p: CyclePhase) => {
    const b = byPhase.get(p) ?? { days: new Set<string>(), cal: 0, pro: 0, water: 0 };
    byPhase.set(p, b);
    return b;
  };

  for (const e of entries) {
    const p = phaseForDate(e.date);
    if (!p) continue;
    const b = bucket(p);
    b.days.add(e.date);
    b.cal += e.calories;
    b.pro += e.protein;
  }
  for (const [d, oz] of Object.entries(waterByDate)) {
    const p = phaseForDate(d);
    if (!p) continue;
    const b = bucket(p);
    b.days.add(d);
    b.water += oz;
  }

  const order: CyclePhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
  return order
    .filter(p => byPhase.has(p))
    .map(p => {
      const b = byPhase.get(p)!;
      const days = Math.max(b.days.size, 1);
      return {
        phase: p,
        label: PHASE_NOURISHMENT[p].label,
        days: b.days.size,
        avgCalories: Math.round(b.cal / days),
        avgProtein: Math.round(b.pro / days),
        avgWater: Math.round(b.water / days),
      };
    });
}
