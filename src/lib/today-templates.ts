import type { WidgetType, DashboardLayoutData } from "@/lib/dashboard-layouts";
import { buildLayoutFromSpecs, saveDashboardLayout, getActivePreset } from "@/lib/dashboard-layouts";

export interface TodayTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accent: string; // tailwind gradient classes for the preview header
  items: { type: WidgetType; w: number; h: number; props?: Record<string, any> }[];
}

export const TODAY_TEMPLATES: TodayTemplate[] = [
  {
    id: "calm-rhythm",
    name: "Calm Rhythm",
    tagline: "Low-noise daily rhythm",
    description:
      "Greeting, moon & cycle, weather, and just your top three tasks. For quiet mornings.",
    accent: "from-emerald-200/70 to-amber-100/70",
    items: [
      { type: "moon-guidance-hero", w: 12, h: 6 },
      { type: "top3", w: 6, h: 5 },
      { type: "weather", w: 6, h: 5 },
      { type: "rhythm", w: 6, h: 5 },
      { type: "journal-prompt", w: 6, h: 5 },
    ],
  },
  {
    id: "command-center",
    name: "Command Center",
    tagline: "Everything in one dense board",
    description:
      "Capacity, tasks, calendar, meals, home reset, and grocery — the full daily dashboard.",
    accent: "from-sky-200/70 to-indigo-200/70",
    items: [
      { type: "hero-greeting", w: 7, h: 5 },
      { type: "capacity-checkin", w: 5, h: 5 },
      { type: "top3", w: 4, h: 5 },
      { type: "appointments-today", w: 4, h: 5 },
      { type: "task-progress", w: 4, h: 5 },
      { type: "meals-today", w: 4, h: 5 },
      { type: "home-reset-checklist", w: 8, h: 6 },
      { type: "grocery-list-mini", w: 4, h: 5 },
      { type: "upcoming-snapshot", w: 4, h: 5 },
      { type: "habits-today", w: 4, h: 5 },
      { type: "care-checkins", w: 4, h: 5 },
      { type: "weather", w: 8, h: 5 },
      { type: "moon", w: 4, h: 5 },
    ],
  },
  {
    id: "focus-mode",
    name: "Focus Mode",
    tagline: "Distraction-free single column",
    description:
      "Top priorities, one pomodoro, and a brain-dump note. Nothing else competes for attention.",
    accent: "from-stone-200/70 to-rose-100/70",
    items: [
      { type: "top3", w: 12, h: 5 },
      { type: "pomodoro", w: 12, h: 5 },
      { type: "todays-focus", w: 12, h: 6 },
      { type: "mental-load-dump", w: 12, h: 5 },
    ],
  },
  {
    id: "family-hub",
    name: "Family Hub",
    tagline: "Household-first",
    description:
      "Who needs you, shared meals, home reset, upcoming events, and grocery — for busy family days.",
    accent: "from-amber-200/70 to-rose-200/70",
    items: [
      { type: "mom-checkin", w: 6, h: 6 },
      { type: "who-needs-me", w: 6, h: 6 },
      { type: "whats-for-dinner", w: 6, h: 6 },
      { type: "meals-today", w: 6, h: 6 },
      { type: "upcoming-snapshot", w: 6, h: 5 },
      { type: "home-reset-quick", w: 6, h: 5 },
      { type: "family-tasks", w: 6, h: 5 },
      { type: "grocery-list-mini", w: 6, h: 5 },
      { type: "birthdays", w: 6, h: 5 },
      { type: "holidays", w: 6, h: 5 },
    ],
  },
];

export function getTemplate(id: string): TodayTemplate | undefined {
  return TODAY_TEMPLATES.find((t) => t.id === id);
}

export function buildTemplateLayout(id: string): DashboardLayoutData | null {
  const t = getTemplate(id);
  if (!t) return null;
  return buildLayoutFromSpecs(t.items);
}

/** Persist the template as the current preset for Today. */
export async function applyTodayTemplate(id: string): Promise<boolean> {
  const data = buildTemplateLayout(id);
  if (!data) return false;
  const preset = getActivePreset("today");
  await saveDashboardLayout("today", preset, data);
  return true;
}