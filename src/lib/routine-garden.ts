import type { Routine } from "@/lib/routines";

export type GardenState = "seedling" | "growing" | "blooming" | "resting";

export interface GardenStateMeta {
  state: GardenState;
  emoji: string;
  label: string;
  cta: string;
  /** Tailwind text color class on semantic tokens. */
  textClass: string;
  /** Tailwind background tint class. */
  bgClass: string;
  /** Border accent. */
  borderClass: string;
}

export const GARDEN_META: Record<GardenState, Omit<GardenStateMeta, "state">> = {
  seedling: {
    emoji: "🌱",
    label: "Needs Care",
    cta: "Start",
    textClass: "text-emerald-700 dark:text-emerald-300",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
  },
  growing: {
    emoji: "🌿",
    label: "Growing",
    cta: "Continue",
    textClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/40",
  },
  blooming: {
    emoji: "🌸",
    label: "Blooming",
    cta: "Blooming",
    textClass: "text-pink-700 dark:text-pink-300",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/30",
  },
  resting: {
    emoji: "🍂",
    label: "Resting",
    cta: "Restart",
    textClass: "text-amber-700 dark:text-amber-300",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
  },
};

export function getRoutineState(r: Routine): GardenState {
  const total = r.items.length;
  if (total === 0) return "resting";
  const done = r.items.filter(i => i.done).length;
  if (done === 0) return "seedling";
  if (done >= total) return "blooming";
  return "growing";
}

export function nextStep(r: Routine) {
  return r.items.find(i => !i.done);
}

export function getMeta(state: GardenState): GardenStateMeta {
  return { state, ...GARDEN_META[state] };
}
