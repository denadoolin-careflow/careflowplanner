import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export type GoalSeason = "spring" | "summer" | "autumn" | "winter";
export type GoalCheckIn = "energizing" | "steady" | "neutral" | "heavy";
export interface GoalDetails {
  why?: string;
  nextStep?: string;
  targetDate?: string;
  milestones?: { id: string; label: string; done: boolean }[];
  startedAt?: string;
  cover?: "sprout" | "moon" | "mountain" | "flower";
  lastCheckIn?: { tone: GoalCheckIn; at: string };
  season?: GoalSeason | null;
  seasonYear?: number | null;
  phase?: RhythmPhase;
  reviewDate?: string;
  compostedAt?: string | null;
  compostReason?: string;
}
export const GOAL_SEASONS: GoalSeason[] = ["spring", "summer", "autumn", "winter"];
export const GOAL_PHASES: RhythmPhase[] = ["plan", "grow", "care", "letgo"];
export const PHASE_GUIDANCE: Record<RhythmPhase, string> = {
  plan: "Choose what matters and name one small first step.",
  grow: "Build gently with repeatable actions and realistic milestones.",
  care: "Tend what is working; adjust your pace and ask for support.",
  letgo: "Reflect, simplify, and make room for what comes next.",
};
export function goalSeasonAt(date: Date): GoalSeason {
  const month = date.getMonth();
  return month >= 2 && month <= 4 ? "spring" : month >= 5 && month <= 7 ? "summer" : month >= 8 && month <= 10 ? "autumn" : "winter";
}
export function isComposted(details?: GoalDetails): boolean { return Boolean(details?.compostedAt); }
export function compostGoal(reason: string, at: string): Partial<GoalDetails> {
  return { compostedAt: at, compostReason: reason.trim() };
}
export function restoreGoal(): Partial<GoalDetails> { return { compostedAt: null }; }
/** Existing remote picks always win when importing old device-only extras. */
export function mergeLegacyGoalDetails(legacy: GoalDetails, saved: GoalDetails): GoalDetails {
  return { ...legacy, ...saved };
}