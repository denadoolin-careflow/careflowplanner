import type { Plan } from "@/hooks/useSubscription";

// Keep in sync with supabase/functions/_shared/ai-meter.ts
export const PLAN_AI_LIMITS: Record<Plan, number> = {
  free: 10,
  pro: 300,
  family: 800,
  lifetime: 300,
};

export const PLAN_HARD_LIMITS = {
  free: {
    habits: 3,
    routines: 1,
    journalEntriesPerWeek: 5,
    familySeats: 1,
    aiActions: PLAN_AI_LIMITS.free,
  },
  pro: {
    habits: Infinity,
    routines: Infinity,
    journalEntriesPerWeek: Infinity,
    familySeats: 1,
    aiActions: PLAN_AI_LIMITS.pro,
  },
  family: {
    habits: Infinity,
    routines: Infinity,
    journalEntriesPerWeek: Infinity,
    familySeats: 4,
    aiActions: PLAN_AI_LIMITS.family,
  },
  lifetime: {
    habits: Infinity,
    routines: Infinity,
    journalEntriesPerWeek: Infinity,
    familySeats: 1,
    aiActions: PLAN_AI_LIMITS.lifetime,
  },
} as const;

export type Feature =
  | "ai"
  | "mental_load_tools"
  | "cycle_planning"
  | "voice_capture"
  | "family_seats"
  | "shared_circles"
  | "home_ai"
  | "meal_ai";

const FEATURE_MIN_PLAN: Record<Feature, Plan[]> = {
  ai: ["free", "pro", "family", "lifetime"], // free has limited budget
  mental_load_tools: ["pro", "family", "lifetime"],
  cycle_planning: ["pro", "family", "lifetime"],
  voice_capture: ["pro", "family", "lifetime"],
  family_seats: ["family"],
  shared_circles: ["family"],
  home_ai: ["pro", "family", "lifetime"],
  meal_ai: ["pro", "family", "lifetime"],
};

export function can(plan: Plan, feature: Feature): boolean {
  return FEATURE_MIN_PLAN[feature].includes(plan);
}

export function limitsFor(plan: Plan) {
  return PLAN_HARD_LIMITS[plan];
}