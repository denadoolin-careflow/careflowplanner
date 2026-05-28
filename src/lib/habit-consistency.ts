import { subDays } from "date-fns";
import type { Habit } from "@/lib/types";

export type GrowthStage = "seed" | "sprout" | "sapling" | "bloom" | "tree";

export interface HabitGrowth {
  ratio: number;        // 0..1 over the rolling window
  doneDays: number;
  windowDays: number;
  stage: GrowthStage;
  stageIndex: number;   // 0..4
  forgivingStreak: number; // never resets to 0 after first completion
  lastDoneISO?: string;
}

const STAGES: GrowthStage[] = ["seed", "sprout", "sapling", "bloom", "tree"];

export function computeHabitGrowth(habit: Habit, windowDays = 14): HabitGrowth {
  const today = new Date();
  let done = 0;
  let lastDone: string | undefined;
  for (let i = 0; i < windowDays; i++) {
    const k = subDays(today, i).toISOString().slice(0, 10);
    if (habit.log[k]) {
      done++;
      if (!lastDone) lastDone = k;
    }
  }
  const ratio = done / windowDays;

  // Forgiving streak: tolerate up to 1 missed day without resetting to 0.
  let streak = 0;
  let misses = 0;
  let everDone = false;
  for (let i = 0; i < 365; i++) {
    const k = subDays(today, i).toISOString().slice(0, 10);
    if (habit.log[k]) {
      streak++;
      everDone = true;
      misses = 0;
    } else {
      misses++;
      if (misses > 1) break;
    }
  }
  if (everDone && streak === 0) streak = 1; // never punish to zero

  let stageIndex = 0;
  if (ratio >= 0.85) stageIndex = 4;
  else if (ratio >= 0.65) stageIndex = 3;
  else if (ratio >= 0.4) stageIndex = 2;
  else if (ratio > 0) stageIndex = 1;

  return {
    ratio,
    doneDays: done,
    windowDays,
    stage: STAGES[stageIndex],
    stageIndex,
    forgivingStreak: streak,
    lastDoneISO: lastDone,
  };
}

export const STAGE_LABEL: Record<GrowthStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  sapling: "Sapling",
  bloom: "Blooming",
  tree: "Flourishing",
};

export const STAGE_AFFIRMATION: Record<GrowthStage, string> = {
  seed: "Plant the first day. Tiny is enough.",
  sprout: "Something stirring. Keep it gentle.",
  sapling: "Roots taking hold. You're showing up.",
  bloom: "This one is alive in you.",
  tree: "Steady and rooted. Beautiful work.",
};
