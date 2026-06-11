import { supabase } from "@/integrations/supabase/client";
import type { ArchetypeId } from "./archetype-quiz";
import {
  defaultLayout, setActivePreset,
  type DashboardLayoutData, type GridItem, type WidgetInstance, type WidgetType,
} from "./dashboard-layouts";
import { routines } from "./routines";
import { setMoonRemindersEnabled } from "./moon-reminders";
import { applyArchetypePack } from "./archetype-starter-pack";

/** Curated widget set per archetype for the Home dashboard. */
const ARCHETYPE_WIDGETS: Record<ArchetypeId, WidgetType[]> = {
  "mental-load-carrier": ["top3", "task-progress", "appointments-today", "family-tasks", "habits-today", "weekly-reset", "care-checkins", "rhythm"],
  "burnt-out-caregiver": ["soft-moment", "top3", "journal-prompt", "habits-today", "moon", "rhythm-forecast", "weekly-reset"],
  "reset-seeker":        ["home-reset", "home-reset-checklist", "habits-today", "weekly-reset", "chore-today", "meals-today", "top3"],
  "neurodivergent-navigator": ["top3", "pomodoro", "task-progress", "mini-tasks", "habits-today", "rhythm", "appointments-today"],
  "gentle-homemaker":    ["meals-today", "home-reset", "home-reset-checklist", "chore-today", "habits-today", "weekly-reset", "weather", "birthdays"],
  "moon-guided-planner": ["moon", "rhythm-forecast", "cycle", "journal-prompt", "soft-moment", "top3", "rhythm"],
  "rebuilding-dreamer":  ["goals", "ideas", "journal-prompt", "habits-today", "top3", "weekly-reset", "soft-moment"],
  "quiet-provider":      ["top3", "task-progress", "budget-summary", "upcoming-bills", "debt-progress", "appointments-today", "weekly-reset"],
  "burnt-out-protector": ["soft-moment", "top3", "habits-today", "journal-prompt", "weekly-reset", "rhythm-forecast"],
  "rebuilding-father":   ["goals", "habits-today", "top3", "task-progress", "weekly-reset", "journal-prompt"],
  "neurodivergent-dad":  ["top3", "pomodoro", "task-progress", "mini-tasks", "habits-today", "appointments-today"],
  "emotional-anchor":    ["journal-prompt", "soft-moment", "top3", "care-checkins", "family-tasks", "rhythm"],
  "overextended-helper": ["soft-moment", "top3", "habits-today", "journal-prompt", "weekly-reset", "rhythm"],
  "soft-systems-thinker":["top3", "weekly-reset", "habits-today", "task-progress", "rhythm-forecast", "goals", "ideas"],
  "cyclical-planner":    ["cycle", "moon", "rhythm-forecast", "rhythm", "journal-prompt", "top3", "weekly-reset"],
};

/** Starter routine items per archetype (seeded under "Me", morning + evening). */
const ARCHETYPE_ROUTINES: Record<ArchetypeId, { morning: string[]; evening: string[] }> = {
  "mental-load-carrier": { morning: ["Brain dump", "Pick top 3", "Check family calendar"], evening: ["Tomorrow's top 3", "Lay out the morning", "Mental download"] },
  "burnt-out-caregiver": { morning: ["Drink water", "3-minute breath", "Pick one tiny task"], evening: ["Soft lighting", "Stretch", "Gratitude line"] },
  "reset-seeker":        { morning: ["10-minute tidy", "Make the bed", "Open the curtains"], evening: ["Sink reset", "Lay out tomorrow", "Light a candle"] },
  "neurodivergent-navigator": { morning: ["Body double timer", "Pick one anchor task", "Sensory check-in"], evening: ["Brain dump", "Lay out tomorrow", "Soft wind-down"] },
  "gentle-homemaker":    { morning: ["Hearth lighting", "Plan today's meal", "Tidy main space"], evening: ["Kitchen reset", "Plan tomorrow's meal", "Slow wind-down"] },
  "moon-guided-planner": { morning: ["Energy check-in", "Pull a card / set intention", "Pick top 3"], evening: ["Moon phase note", "Release the day", "Soft reflection"] },
  "rebuilding-dreamer":  { morning: ["Morning page", "One tiny step", "Pick top 3"], evening: ["One win", "Tomorrow's intention", "Gratitude"] },
  "quiet-provider":      { morning: ["Priorities for today", "Check bills/calendar", "Body check-in"], evening: ["Shut-down ritual", "Tomorrow's plan", "Decompress"] },
  "burnt-out-protector": { morning: ["Body scan", "Pick one priority", "Hydrate"], evening: ["Put it down", "Soft wind-down", "Gratitude"] },
  "rebuilding-father":   { morning: ["Movement", "Top 3 for today", "One forward step"], evening: ["One win", "Tomorrow's plan", "Reflect"] },
  "neurodivergent-dad":  { morning: ["Visual day plan", "Anchor task", "Hydrate"], evening: ["Tomorrow's plan", "Reduce clutter cue", "Wind-down"] },
  "emotional-anchor":    { morning: ["Ground (5-4-3-2-1)", "Pick top 3", "Care check-in"], evening: ["Release others' weight", "Journal a line", "Soft reset"] },
  "overextended-helper": { morning: ["Pick one thing for me", "Hydrate", "Boundary check-in"], evening: ["Me-window (10 min)", "Tomorrow's top 3", "Soft exhale"] },
  "soft-systems-thinker":{ morning: ["Review top 3", "Tidy the dashboard", "Tiny weekly tune-up"], evening: ["Tomorrow's plan", "One small refinement", "Wind-down"] },
  "cyclical-planner":    { morning: ["Cycle/energy check-in", "Phase-aware top 3", "Soft start"], evening: ["Phase note", "Rest ritual", "Reflect"] },
};

const MOON_AWARE: ArchetypeId[] = ["moon-guided-planner", "cyclical-planner", "reset-seeker", "rebuilding-dreamer", "burnt-out-caregiver"];

function packLayoutFromTypes(types: WidgetType[]): DashboardLayoutData {
  const cols = 12;
  let x = 0, y = 0, rowH = 0;
  const widgets: WidgetInstance[] = [];
  const layout: GridItem[] = [];
  const uid = () => (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
  for (const t of types) {
    const w = t === "task-progress" ? 6 : t === "home-reset-checklist" ? 8 : 4;
    const h = t === "task-progress" ? 4 : t === "home-reset-checklist" ? 6 : 5;
    if (x + w > cols) { x = 0; y += rowH; rowH = 0; }
    const id = uid();
    widgets.push({ id, type: t });
    layout.push({ i: id, x, y, w, h, minW: 3, minH: 3 });
    x += w;
    rowH = Math.max(rowH, h);
  }
  return { widgets, layout };
}

const PRESET_NAME = "Archetype";

/** Apply the recommended dashboard, routines, and reminders for the chosen archetype.
 *  Safe to call without auth — db writes are skipped if signed out, local-only effects still apply. */
export async function applyArchetypeSetup(archetypeId: ArchetypeId): Promise<void> {
  // 1) Reminders (local pref)
  setMoonRemindersEnabled(MOON_AWARE.includes(archetypeId));

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;

  // 2) Dashboard preset for the home page
  const types = ARCHETYPE_WIDGETS[archetypeId] ?? [];
  const data = types.length ? packLayoutFromTypes(types) : defaultLayout("home");
  if (uid) {
    const name = `home::${PRESET_NAME}`;
    const { data: existing } = await supabase
      .from("dashboard_layouts").select("id").eq("user_id", uid).eq("name", name).maybeSingle();
    const payload = {
      user_id: uid,
      name,
      layout: { items: data.layout, pageTheme: null } as any,
      widgets: data.widgets as any,
      is_active: true,
    };
    if (existing?.id) {
      await supabase.from("dashboard_layouts").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("dashboard_layouts").insert(payload);
    }
  }
  setActivePreset("home", PRESET_NAME);

  // 3) Starter routines (only when signed in, and only if that slot is empty)
  if (uid) {
    const seed = ARCHETYPE_ROUTINES[archetypeId];
    if (seed) {
      const person = "Me";
      const mkItems = (lines: string[]) =>
        lines.map((text) => ({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, text, done: false }));
      const morning = routines.find(person, "morning");
      if (!morning || morning.items.length === 0) {
        await routines.upsert(person, "morning", { items: mkItems(seed.morning) });
      }
      const evening = routines.find(person, "evening");
      if (!evening || evening.items.length === 0) {
        await routines.upsert(person, "evening", { items: mkItems(seed.evening) });
      }
    }

    // 4) Habit + task starter pack (safe to re-run; dedupes by title).
    try { await applyArchetypePack(archetypeId); } catch { /* non-fatal */ }
  }
}