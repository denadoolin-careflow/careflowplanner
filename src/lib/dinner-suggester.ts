import { aiInvoke } from "@/lib/ai-invoke";

export interface DinnerSuggestion {
  name: string;
  prep_minutes: number;
  cook_minutes: number;
  ingredients: string[];
  easy_tag: string;          // "Easy" | "Prep Ahead" | "One Pot" | etc.
  reason: string;            // why it fits today
}

export type DinnerFilter =
  | "toddler" | "sensory" | "low-energy" | "15-min" | "freezer" | "healthy" | "budget";

export interface DinnerRequest {
  energy?: number | null;
  filters?: DinnerFilter[];
  mode?: "smart" | "pantry_only";
  family_size?: number;
  pantry?: string[];
  avoid?: string[];
}

export async function suggestDinners(req: DinnerRequest): Promise<DinnerSuggestion[]> {
  const { data, error } = await aiInvoke<{ suggestions: DinnerSuggestion[] }>("ai-dinner-tonight", {
    body: req,
  });
  if (error) throw error;
  return data?.suggestions ?? [];
}