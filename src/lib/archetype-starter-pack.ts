import { supabase } from "@/integrations/supabase/client";
import type { ArchetypeId } from "./archetype-quiz";
import type { Area, Energy, Priority, DayPart } from "./types";

/** Personalized habit + task suggestions per caregiver archetype.
 *  Used by `applyArchetypeSetup` to seed a starter daily + weekly plan and
 *  surfaced in Settings → Archetype & theme as a regeneratable pack. */

export type HabitSeed = {
  title: string;
  cadence: "daily" | "weekly" | "monthly";
  category: "self-care" | "home" | "family" | "caregiving" | "health" | "creative" | "spiritual";
  timesOfDay?: ("morning" | "midday" | "afternoon" | "evening" | "anytime")[];
};

export type TaskSeed = {
  title: string;
  area: Area;
  priority?: Priority;
  energy?: Energy;
  dayPart?: DayPart;
  /** When set, the task recurs weekly on these weekdays (0=Sun..6=Sat). */
  weeklyDays?: number[];
  isTopThree?: boolean;
  notes?: string;
};

export type ArchetypePack = {
  habits: HabitSeed[];
  daily: TaskSeed[];
  weekly: TaskSeed[];
};

const SELF_CARE_MIN: HabitSeed[] = [
  { title: "Drink a glass of water", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
  { title: "Step outside for 5 minutes", cadence: "daily", category: "self-care", timesOfDay: ["midday"] },
];

const RESET_WEEKLY: TaskSeed[] = [
  { title: "Sunday soft reset", area: "Home", priority: "medium", energy: "medium", dayPart: "Morning", weeklyDays: [0] },
  { title: "Plan the week's top 3 priorities", area: "Personal", priority: "high", energy: "medium", dayPart: "Evening", weeklyDays: [0] },
];

export const ARCHETYPE_PACKS: Record<ArchetypeId, ArchetypePack> = {
  "mental-load-carrier": {
    habits: [
      { title: "Morning brain dump", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Evening mental download", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
      { title: "Check the family calendar", cadence: "daily", category: "family", timesOfDay: ["morning"] },
    ],
    daily: [
      { title: "Pick today's top 3", area: "Personal", priority: "high", energy: "low", dayPart: "Morning", isTopThree: true },
      { title: "10-minute family handoff", area: "Family", priority: "medium", energy: "low", dayPart: "Evening" },
    ],
    weekly: [
      { title: "Sunday weekly reset & calendar sync", area: "Family", priority: "high", energy: "medium", dayPart: "Evening", weeklyDays: [0] },
      { title: "Delegate one recurring task", area: "Family", priority: "medium", energy: "low", dayPart: "Morning", weeklyDays: [3] },
    ],
  },
  "burnt-out-caregiver": {
    habits: [
      { title: "3-minute breath reset", cadence: "daily", category: "self-care", timesOfDay: ["morning", "afternoon"] },
      { title: "Drink water with each meal", cadence: "daily", category: "health", timesOfDay: ["anytime"] },
      { title: "Evening exhale ritual", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Pick one tiny task (and stop there)", area: "Personal", priority: "low", energy: "low", dayPart: "Morning", isTopThree: true },
      { title: "Soft lighting + wind-down", area: "Personal", priority: "low", energy: "low", dayPart: "Evening" },
    ],
    weekly: [
      { title: "Schedule one rest block", area: "Personal", priority: "high", energy: "low", dayPart: "Morning", weeklyDays: [0] },
      { title: "Burnout check-in journal", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [5] },
    ],
  },
  "reset-seeker": {
    habits: [
      { title: "10-minute tidy", cadence: "daily", category: "home", timesOfDay: ["morning"] },
      { title: "Make the bed", cadence: "daily", category: "home", timesOfDay: ["morning"] },
      { title: "Sink reset before bed", cadence: "daily", category: "home", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "One zone reset (10 min)", area: "Home", priority: "medium", energy: "medium", dayPart: "Afternoon" },
    ],
    weekly: [
      ...RESET_WEEKLY,
      { title: "Pantry / fridge wipe-down", area: "Home", priority: "low", energy: "medium", dayPart: "Morning", weeklyDays: [6] },
    ],
  },
  "neurodivergent-navigator": {
    habits: [
      { title: "Body double timer (25 min)", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Sensory check-in", cadence: "daily", category: "self-care", timesOfDay: ["midday"] },
      { title: "Visual day plan", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
    ],
    daily: [
      { title: "Pick one anchor task", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
      { title: "Tidy one visible surface", area: "Home", priority: "low", energy: "low", dayPart: "Evening" },
    ],
    weekly: [
      { title: "Brain dump and triage inbox", area: "Personal", priority: "medium", energy: "medium", dayPart: "Morning", weeklyDays: [0] },
      { title: "Lay out tomorrow's anchor task", area: "Personal", priority: "low", energy: "low", dayPart: "Evening", weeklyDays: [4] },
    ],
  },
  "gentle-homemaker": {
    habits: [
      { title: "Light the hearth (candle or lamp)", cadence: "daily", category: "home", timesOfDay: ["morning"] },
      { title: "Plan today's meal", cadence: "daily", category: "home", timesOfDay: ["morning"] },
      { title: "Kitchen reset", cadence: "daily", category: "home", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Tidy the main living space", area: "Home", priority: "medium", energy: "medium", dayPart: "Afternoon" },
      { title: "Prep tomorrow's breakfast", area: "Meals", priority: "low", energy: "low", dayPart: "Evening" },
    ],
    weekly: [
      { title: "Plan next week's meals", area: "Meals", priority: "high", energy: "medium", dayPart: "Morning", weeklyDays: [0] },
      { title: "Seasonal home refresh (one small swap)", area: "Home", priority: "low", energy: "medium", dayPart: "Afternoon", weeklyDays: [6] },
    ],
  },
  "moon-guided-planner": {
    habits: [
      { title: "Daily energy check-in", cadence: "daily", category: "spiritual", timesOfDay: ["morning"] },
      { title: "Moon phase note", cadence: "daily", category: "spiritual", timesOfDay: ["evening"] },
      { title: "Pull a card or set intention", cadence: "daily", category: "spiritual", timesOfDay: ["morning"] },
    ],
    daily: [
      { title: "Phase-aware top 3", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
    ],
    weekly: [
      { title: "New or full moon ritual", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [0] },
      { title: "Reflect on the week's cycle", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [6] },
    ],
  },
  "rebuilding-dreamer": {
    habits: [
      { title: "Morning page (3 min)", cadence: "daily", category: "creative", timesOfDay: ["morning"] },
      { title: "One tiny step on a dream project", cadence: "daily", category: "creative", timesOfDay: ["afternoon"] },
      { title: "Note one win", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "15 minutes on creative work", area: "Creative Projects", priority: "medium", energy: "medium", dayPart: "Afternoon", isTopThree: true },
    ],
    weekly: [
      { title: "Tiny weekly win review", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [0] },
      { title: "Identity check-in journal", area: "Personal", priority: "low", energy: "low", dayPart: "Morning", weeklyDays: [3] },
    ],
  },
  "quiet-provider": {
    habits: [
      { title: "Body check-in (1 min)", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Evening shut-down ritual", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
      { title: "Glance at bills and calendar", cadence: "daily", category: "family", timesOfDay: ["morning"] },
    ],
    daily: [
      { title: "Set today's priorities", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
      { title: "10-minute decompress", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening" },
    ],
    weekly: [
      { title: "Weekly review: bills, calendar, priorities", area: "Money", priority: "high", energy: "medium", dayPart: "Morning", weeklyDays: [0] },
      { title: "One conversation that supports you", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [3] },
    ],
  },
  "burnt-out-protector": {
    habits: [
      { title: "Morning body scan", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Hydrate (full glass)", cadence: "daily", category: "health", timesOfDay: ["morning", "afternoon"] },
      { title: "Put it down ritual", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Pick one priority (just one)", area: "Personal", priority: "high", energy: "low", dayPart: "Morning", isTopThree: true },
    ],
    weekly: [
      { title: "Schedule one true rest block", area: "Personal", priority: "high", energy: "low", dayPart: "Morning", weeklyDays: [0] },
      { title: "Ask for one specific support", area: "Family", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [2] },
    ],
  },
  "rebuilding-father": {
    habits: [
      { title: "Movement (10 min)", cadence: "daily", category: "health", timesOfDay: ["morning"] },
      { title: "One forward step on a goal", cadence: "daily", category: "self-care", timesOfDay: ["afternoon"] },
      { title: "Note one win", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Pick today's top 3", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
    ],
    weekly: [
      { title: "Sunday reflection and week plan", area: "Personal", priority: "high", energy: "medium", dayPart: "Evening", weeklyDays: [0] },
      { title: "30-minute movement session", area: "Personal", priority: "medium", energy: "high", dayPart: "Morning", weeklyDays: [3] },
    ],
  },
  "neurodivergent-dad": {
    habits: [
      { title: "Visual day plan", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Hydrate", cadence: "daily", category: "health", timesOfDay: ["morning", "afternoon"] },
      { title: "Reduce one clutter cue", cadence: "daily", category: "home", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Anchor task (one focus block)", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
    ],
    weekly: [
      { title: "Brain dump and triage", area: "Personal", priority: "medium", energy: "medium", dayPart: "Morning", weeklyDays: [0] },
      { title: "Lay out tomorrow's plan", area: "Personal", priority: "low", energy: "low", dayPart: "Evening", weeklyDays: [4] },
    ],
  },
  "emotional-anchor": {
    habits: [
      { title: "Ground (5-4-3-2-1)", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Emotional check-in", cadence: "daily", category: "self-care", timesOfDay: ["afternoon"] },
      { title: "Evening release", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Pick top 3 (for you, not just them)", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
      { title: "Care check-in with one loved one", area: "Family", priority: "medium", energy: "low", dayPart: "Afternoon" },
    ],
    weekly: [
      { title: "Journal: what did I carry this week?", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [0] },
    ],
  },
  "overextended-helper": {
    habits: [
      { title: "Pick one thing for me", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Boundary check-in", cadence: "daily", category: "self-care", timesOfDay: ["afternoon"] },
      { title: "10-minute me window", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "Schedule one me-thing today", area: "Personal", priority: "high", energy: "low", dayPart: "Afternoon", isTopThree: true },
    ],
    weekly: [
      { title: "Practice one small no", area: "Personal", priority: "medium", energy: "low", dayPart: "Morning", weeklyDays: [1] },
      { title: "Weekly me-time block (30 min)", area: "Personal", priority: "high", energy: "low", dayPart: "Afternoon", weeklyDays: [6] },
    ],
  },
  "soft-systems-thinker": {
    habits: [
      { title: "Review top 3", cadence: "daily", category: "self-care", timesOfDay: ["morning"] },
      { title: "Tiny dashboard tidy", cadence: "daily", category: "self-care", timesOfDay: ["evening"] },
    ],
    daily: [
      { title: "One small refinement to a system", area: "Personal", priority: "low", energy: "low", dayPart: "Afternoon" },
    ],
    weekly: [
      ...RESET_WEEKLY,
      { title: "Tuesday tune-up", area: "Personal", priority: "low", energy: "low", dayPart: "Morning", weeklyDays: [2] },
      { title: "Friday wind-down review", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [5] },
    ],
  },
  "cyclical-planner": {
    habits: [
      { title: "Cycle and energy check-in", cadence: "daily", category: "spiritual", timesOfDay: ["morning"] },
      { title: "Phase note", cadence: "daily", category: "spiritual", timesOfDay: ["evening"] },
      ...SELF_CARE_MIN,
    ],
    daily: [
      { title: "Phase-aware top 3", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", isTopThree: true },
    ],
    weekly: [
      { title: "Phase planning ritual", area: "Personal", priority: "high", energy: "medium", dayPart: "Morning", weeklyDays: [0] },
      { title: "Rest ritual", area: "Personal", priority: "medium", energy: "low", dayPart: "Evening", weeklyDays: [3] },
    ],
  },
};

export function getArchetypePack(id: ArchetypeId): ArchetypePack {
  return ARCHETYPE_PACKS[id];
}

function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Find the next ISO date (yyyy-mm-dd) at or after today matching one of `weeklyDays` (0=Sun..6=Sat). */
function nextWeeklyDate(weeklyDays: number[] | undefined): string {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  if (!weeklyDays || weeklyDays.length === 0) return localTodayISO();
  for (let i = 0; i < 7; i++) {
    const probe = new Date(base);
    probe.setDate(base.getDate() + i);
    if (weeklyDays.includes(probe.getDay())) {
      return `${probe.getFullYear()}-${String(probe.getMonth() + 1).padStart(2, "0")}-${String(probe.getDate()).padStart(2, "0")}`;
    }
  }
  return localTodayISO();
}

export type ApplyPackResult = {
  habitsCreated: number;
  dailyCreated: number;
  weeklyCreated: number;
  skipped: number;
};

/** Seed the user's habits + tasks from an archetype pack. Existing rows with
 *  the same title are skipped, so this is safe to re-run. */
export async function applyArchetypePack(archetypeId: ArchetypeId): Promise<ApplyPackResult> {
  const result: ApplyPackResult = { habitsCreated: 0, dailyCreated: 0, weeklyCreated: 0, skipped: 0 };
  const pack = ARCHETYPE_PACKS[archetypeId];
  if (!pack) return result;

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return result;

  // Habits — dedupe by title (case-insensitive).
  const { data: existingHabits } = await supabase
    .from("habits").select("title").eq("user_id", uid);
  const habitTitles = new Set((existingHabits ?? []).map((h: any) => (h.title ?? "").toLowerCase()));
  const newHabits = pack.habits
    .filter(h => !habitTitles.has(h.title.toLowerCase()))
    .map(h => ({
      user_id: uid,
      title: h.title,
      cadence: h.cadence,
      category: h.category,
      meta: { timesOfDay: h.timesOfDay ?? ["anytime"] } as any,
    }));
  if (newHabits.length) {
    const { data: ins } = await supabase.from("habits").insert(newHabits as any).select("id");
    result.habitsCreated = ins?.length ?? 0;
  }
  result.skipped += pack.habits.length - newHabits.length;

  // Tasks — dedupe by title across upcoming tasks.
  const today = localTodayISO();
  const { data: existingTasks } = await supabase
    .from("tasks").select("title").eq("user_id", uid).gte("due_date", today);
  const taskTitles = new Set((existingTasks ?? []).map((t: any) => (t.title ?? "").toLowerCase()));

  const buildRow = (s: TaskSeed, dueDate: string, recurrence: "none" | "daily" | "weekly") => ({
    user_id: uid,
    title: s.title,
    area: s.area,
    priority: s.priority ?? "medium",
    energy: s.energy ?? null,
    day_part: s.dayPart ?? null,
    notes: s.notes ?? null,
    done: false,
    status: "active",
    is_top_three: !!s.isTopThree,
    due_date: dueDate,
    recurrence_type: recurrence,
    recurrence_interval: 1,
    recurrence_days: recurrence === "weekly" ? (s.weeklyDays ?? []) : [],
    auto_reset: recurrence === "daily",
  });

  const dailyRows = pack.daily
    .filter(s => !taskTitles.has(s.title.toLowerCase()))
    .map(s => buildRow(s, today, "daily"));
  if (dailyRows.length) {
    const { data: ins } = await supabase.from("tasks").insert(dailyRows as any).select("id");
    result.dailyCreated = ins?.length ?? 0;
  }
  result.skipped += pack.daily.length - dailyRows.length;

  const weeklyRows = pack.weekly
    .filter(s => !taskTitles.has(s.title.toLowerCase()))
    .map(s => buildRow(s, nextWeeklyDate(s.weeklyDays), "weekly"));
  if (weeklyRows.length) {
    const { data: ins } = await supabase.from("tasks").insert(weeklyRows as any).select("id");
    result.weeklyCreated = ins?.length ?? 0;
  }
  result.skipped += pack.weekly.length - weeklyRows.length;

  return result;
}
