/** Personal workspace quiz: answers → recommendations (pure, tested). */
export type QuizAnswers = {
  season?: "steady" | "busy" | "transition" | "recovering";
  role?: "self" | "parent" | "caregiver" | "both";
  areas?: number[]; // life houses
  energy?: "morning" | "evening" | "cycle" | "varies";
  start?: "/" | "/planner" | "/notes" | "/goals";
  quickAdd?: boolean;
  nudges?: boolean;
};

export type Recommendation = {
  areas: number[];
  goals: { title: string; lifeHouse: number }[];
  startRoute: string;
  todayPrefs: { showQuickAdd: boolean; showCareyNudges: boolean };
  pages: { label: string; to: string }[];
};

const STARTER: Record<number, string> = {
  1: "Feel steady in my body", 2: "Build a calm money rhythm", 3: "Keep in touch with people who matter",
  4: "Make home feel restful", 5: "Make time for joy and creativity", 6: "Keep a gentle daily care routine",
  7: "Nurture my closest relationship", 8: "Lighten shared bills and paperwork", 9: "Learn something new this season",
  10: "Take one step toward meaningful work", 11: "Find my people and community", 12: "Protect time to rest",
};

export function recommendWorkspace(a: QuizAnswers): Recommendation {
  const base = a.areas?.length ? a.areas : [];
  const extra: number[] = [];
  if (a.role === "caregiver" || a.role === "both") extra.push(6);
  if (a.role === "parent" || a.role === "both") extra.push(4);
  if (a.season === "recovering" || a.season === "busy") extra.push(12);
  const areas = [...new Set([...base, ...extra])].slice(0, 3);
  const pages: Recommendation["pages"] = [{ label: "Goals & life areas", to: "/goals" }];
  if (a.role === "caregiver" || a.role === "both") pages.push({ label: "Care", to: "/care" });
  if (a.role === "parent" || a.role === "both") pages.push({ label: "Home", to: "/home" });
  if (a.energy === "cycle") pages.push({ label: "Cycle", to: "/cycle" });
  if (a.energy === "varies" || a.energy === "cycle") pages.push({ label: "Moon & rituals", to: "/cosmic-flow/moon" });
  pages.push({ label: "Library", to: "/library" });
  return {
    areas,
    goals: areas.map(h => ({ title: STARTER[h], lifeHouse: h })),
    startRoute: a.start ?? (a.season === "busy" ? "/planner" : "/"),
    todayPrefs: { showQuickAdd: a.quickAdd ?? true, showCareyNudges: a.nudges ?? a.season !== "busy" },
    pages,
  };
}
