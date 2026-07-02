import { useEffect, useState } from "react";

/** Customization for the Today "Goal Check-In" card. */
export interface GoalGroupCfg {
  id: string;
  label: string;
  categories: string[]; // task/goal categories that roll up into this group
  color: string;        // hsl(...) or #hex
  hidden?: boolean;
}

const K = "careflow:today:goal-checkin:v1";

export const DEFAULT_GOAL_GROUPS: GoalGroupCfg[] = [
  { id: "health",   label: "Health & Wellness",       categories: ["Health", "Home"],           color: "hsl(var(--primary))" },
  { id: "family",   label: "Family & Relationships",  categories: ["Family", "Relationship", "Caregiving"], color: "hsl(45 80% 60%)" },
  { id: "growth",   label: "Personal Growth",         categories: ["Personal", "Creative", "Financial"],    color: "hsl(160 60% 55%)" },
];

function read(): GoalGroupCfg[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(K) : null;
    if (!raw) return DEFAULT_GOAL_GROUPS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(x => x && typeof x.id === "string")) return parsed as GoalGroupCfg[];
    return DEFAULT_GOAL_GROUPS;
  } catch { return DEFAULT_GOAL_GROUPS; }
}
function write(v: GoalGroupCfg[]) {
  try { localStorage.setItem(K, JSON.stringify(v)); } catch { /* noop */ }
}

export function useGoalGroups(): [GoalGroupCfg[], (updater: (prev: GoalGroupCfg[]) => GoalGroupCfg[]) => void, () => void] {
  const [groups, setGroups] = useState<GoalGroupCfg[]>(() => read());
  useEffect(() => { write(groups); }, [groups]);
  const update = (u: (prev: GoalGroupCfg[]) => GoalGroupCfg[]) => setGroups(u);
  const reset = () => setGroups(DEFAULT_GOAL_GROUPS);
  return [groups, update, reset];
}