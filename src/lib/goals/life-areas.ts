/** Life areas = the 12 astrological houses, in plain language. */
export const LIFE_AREAS: Record<number, { label: string; hint: string }> = {
  1: { label: "Self", hint: "Body, energy, how you show up" },
  2: { label: "Money & values", hint: "Income, security, self-worth" },
  3: { label: "Communication", hint: "Learning, writing, siblings, errands" },
  4: { label: "Home & family", hint: "Roots, home, emotional base" },
  5: { label: "Joy & creativity", hint: "Play, kids, romance, making" },
  6: { label: "Health & daily care", hint: "Routines, work, wellbeing" },
  7: { label: "Partnerships", hint: "Partners, close collaborators" },
  8: { label: "Shared resources & healing", hint: "Debts, shared money, deep change" },
  9: { label: "Learning & travel", hint: "Study, beliefs, big trips" },
  10: { label: "Career & purpose", hint: "Vocation, reputation, legacy" },
  11: { label: "Community & hopes", hint: "Friends, groups, future wishes" },
  12: { label: "Rest & spirit", hint: "Solitude, rest, inner work" },
};

export const LIFE_HOUSES = Array.from({ length: 12 }, (_, i) => i + 1);

export function lifeAreaLabel(house?: number | null): string | null {
  return house && LIFE_AREAS[house] ? LIFE_AREAS[house].label : null;
}

/** Percent of linked tasks that are done (0 when nothing is linked). */
export function goalTaskProgress(tasks: { done?: boolean }[]): number {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);
}

/** Progress shown for a goal: auto from tasks when enabled and tasks exist, else manual. */
export function effectiveGoalProgress(goal: { progress: number; autoProgress?: boolean }, tasks: { done?: boolean }[]): number {
  return goal.autoProgress && tasks.length ? goalTaskProgress(tasks) : goal.progress;
}
