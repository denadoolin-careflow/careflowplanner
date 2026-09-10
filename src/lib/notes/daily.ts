import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreatePeriodNote, updateNote, type Note, type PeriodKind } from "@/lib/notes";
import { periodTitle } from "@/lib/notes/periods";

/* ------------------------------------------------------------------ */
/* Period note templates (daily / weekly / monthly)                    */
/* ------------------------------------------------------------------ */

export interface DailyTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Markdown body for the given period key. */
  build: (dateISO: string) => string;
}
export type PeriodTemplate = DailyTemplate;

const pretty = (iso: string) => {
  try { return format(new Date(`${iso}T12:00:00`), "EEEE, MMMM d"); } catch { return iso; }
};

export const DAILY_TEMPLATES: DailyTemplate[] = [
  {
    id: "morning",
    name: "Morning check-in",
    emoji: "🌅",
    description: "How you slept, how you feel, what today needs.",
    build: (iso) => [
      `# ${pretty(iso)}`, "",
      "## Morning check-in", "",
      "**Sleep:** ", "", "**Energy (1–5):** ", "", "**Mood:** ", "",
      "**What today needs from me**", "", "- ", "",
      "**One kind thing for myself**", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "gratitude",
    name: "Gratitude",
    emoji: "💛",
    description: "Three good things and one person to thank.",
    build: (iso) => [
      `# ${pretty(iso)}`, "",
      "## Grateful for", "", "1. ", "2. ", "3. ", "",
      "## Someone to thank", "", "- ", "",
      "## A small moment I want to remember", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "priorities",
    name: "Priorities",
    emoji: "🎯",
    description: "Top 3, must-dos, and what can wait.",
    build: (iso) => [
      `# ${pretty(iso)}`, "",
      "## Top 3 today", "", "- [ ] ", "- [ ] ", "- [ ] ", "",
      "## If there's room", "", "- [ ] ", "",
      "## Can wait", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "reflection",
    name: "Evening reflection",
    emoji: "🌙",
    description: "What went well, what was hard, tomorrow's first step.",
    build: (iso) => [
      `# ${pretty(iso)}`, "",
      "## What went well", "", "- ", "",
      "## What was hard", "", "- ", "",
      "## What I learned", "", "- ", "",
      "## Tomorrow's first step", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "full",
    name: "Full day page",
    emoji: "📓",
    description: "Morning, priorities, gratitude and reflection together.",
    build: (iso) => [
      `# ${pretty(iso)}`, "",
      "## Morning check-in", "", "**Energy (1–5):** ", "", "**Mood:** ", "",
      "## Top 3 today", "", "- [ ] ", "- [ ] ", "- [ ] ", "",
      "## Notes", "", "- ", "",
      "## Grateful for", "", "- ", "",
      "## Evening reflection", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "blank",
    name: "Blank page",
    emoji: "📝",
    description: "Just the date — write freely.",
    build: (iso) => `# ${pretty(iso)}\n\n`,
  },
];

export const WEEKLY_TEMPLATES: PeriodTemplate[] = [
  {
    id: "week-plan",
    name: "Week plan",
    emoji: "🗓️",
    description: "Intentions, top 3, and what to protect.",
    build: (iso) => [
      `# ${periodTitle("weekly", iso)}`, "",
      "## Intentions for the week", "", "- ", "",
      "## Top 3 this week", "", "- [ ] ", "- [ ] ", "- [ ] ", "",
      "## What to protect", "", "- ", "",
      "## People to reach", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "week-review",
    name: "Week review",
    emoji: "🔁",
    description: "Wins, what was hard, and next week's first step.",
    build: (iso) => [
      `# ${periodTitle("weekly", iso)}`, "",
      "## Wins", "", "- ", "",
      "## What was hard", "", "- ", "",
      "## What I'm letting go of", "", "- ", "",
      "## Next week", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "week-full",
    name: "Full week page",
    emoji: "📓",
    description: "Plan on top, review underneath.",
    build: (iso) => [
      `# ${periodTitle("weekly", iso)}`, "",
      "## Intentions", "", "- ", "",
      "## Top 3", "", "- [ ] ", "- [ ] ", "- [ ] ", "",
      "## Notes through the week", "", "- ", "",
      "## Wins", "", "- ", "",
      "## What was hard", "", "- ", "",
      "## Next week", "", "- ", "",
    ].join("\n"),
  },
  { id: "blank", name: "Blank page", emoji: "📝", description: "Just the week — write freely.", build: (iso) => `# ${periodTitle("weekly", iso)}\n\n` },
];

export const MONTHLY_TEMPLATES: PeriodTemplate[] = [
  {
    id: "month-focus",
    name: "Month focus",
    emoji: "🎯",
    description: "Focus, key dates, and what to prepare early.",
    build: (iso) => [
      `# ${periodTitle("monthly", iso)}`, "",
      "## Focus this month", "", "- ", "",
      "## Key dates & events", "", "- ", "",
      "## Prepare early", "", "- [ ] ", "",
      "## One thing to simplify", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "month-review",
    name: "Month review",
    emoji: "🌙",
    description: "Highlights, challenges, lessons, next month.",
    build: (iso) => [
      `# ${periodTitle("monthly", iso)}`, "",
      "## Highlights", "", "- ", "",
      "## Challenges", "", "- ", "",
      "## Lessons", "", "- ", "",
      "## Next month", "", "- ", "",
    ].join("\n"),
  },
  {
    id: "month-full",
    name: "Full month page",
    emoji: "📓",
    description: "Focus, highlights, challenges, lessons and next month.",
    build: (iso) => [
      `# ${periodTitle("monthly", iso)}`, "",
      "## Focus", "", "- ", "",
      "## Key dates", "", "- ", "",
      "## Highlights", "", "- ", "",
      "## Challenges", "", "- ", "",
      "## Lessons", "", "- ", "",
      "## Next month", "", "- ", "",
    ].join("\n"),
  },
  { id: "blank", name: "Blank page", emoji: "📝", description: "Just the month — write freely.", build: (iso) => `# ${periodTitle("monthly", iso)}\n\n` },
];

export const TEMPLATES_BY_KIND: Record<PeriodKind, PeriodTemplate[]> = {
  daily: DAILY_TEMPLATES,
  weekly: WEEKLY_TEMPLATES,
  monthly: MONTHLY_TEMPLATES,
};

const DEFAULT_ID: Record<PeriodKind, string> = { daily: "morning", weekly: "week-plan", monthly: "month-focus" };

export const getPeriodTemplate = (kind: PeriodKind, id: string | null | undefined) =>
  TEMPLATES_BY_KIND[kind].find(t => t.id === id) ?? null;
export const getDailyTemplate = (id: string | null | undefined) => getPeriodTemplate("daily", id);

const PREF_KEYS: Record<PeriodKind, string> = {
  daily: "careflow:daily-note-template:v1",
  weekly: "careflow:weekly-note-template:v1",
  monthly: "careflow:monthly-note-template:v1",
};

/** The user's preferred default layout for a period kind. */
export function useDefaultPeriodTemplate(kind: PeriodKind): [string, (id: string) => void] {
  const [id, setId] = useState<string>(DEFAULT_ID[kind]);
  useEffect(() => {
    setId(readDefaultPeriodTemplate(kind));
  }, [kind]);
  const set = useCallback((next: string) => {
    setId(next);
    try { localStorage.setItem(PREF_KEYS[kind], next); } catch { /* ignore */ }
  }, [kind]);
  return [id, set];
}
export const useDefaultDailyTemplate = () => useDefaultPeriodTemplate("daily");

export const readDefaultPeriodTemplate = (kind: PeriodKind): string => {
  try {
    const v = localStorage.getItem(PREF_KEYS[kind]);
    return v && getPeriodTemplate(kind, v) ? v : DEFAULT_ID[kind];
  } catch { return DEFAULT_ID[kind]; }
};
export const readDefaultDailyTemplate = () => readDefaultPeriodTemplate("daily");

const isEmptyBody = (body: string) => body.replace(/[#\s>*-]/g, "").trim().length === 0;

/**
 * Open (or create) a period's note, seeding the chosen layout when the note
 * is still empty. Never overwrites writing that already exists.
 */
export async function openPeriodNoteWithTemplate(kind: PeriodKind, keyISO: string, templateId?: string | null): Promise<Note> {
  const note = await getOrCreatePeriodNote(kind, keyISO, periodTitle(kind, keyISO));
  const tpl = getPeriodTemplate(kind, templateId ?? null);
  if (tpl && isEmptyBody(note.body)) {
    const body = tpl.build(keyISO);
    await updateNote(note.id, { body });
    note.body = body;
  }
  notifyDailyNotesChanged();
  return note;
}
export const openDailyNoteWithTemplate = (dateISO: string, templateId?: string | null) =>
  openPeriodNoteWithTemplate("daily", dateISO, templateId);

/* ------------------------------------------------------------------ */
/* "Did I write?" marks for planner cells                              */
/* ------------------------------------------------------------------ */

export interface DailyNoteMark {
  id: string;
  date: string;
  /** Has real content beyond the seeded headings. */
  written: boolean;
}
export type PeriodNoteMark = DailyNoteMark;

const CHANGED_EVENT = "careflow:daily-notes:changed";
export const notifyDailyNotesChanged = () => {
  try { window.dispatchEvent(new Event(CHANGED_EVENT)); } catch { /* ignore */ }
};

export const hasWriting = (body: string) => {
  const stripped = body
    .split("\n")
    .filter(l => !/^\s*#{1,6}\s/.test(l))
    .join("\n")
    .replace(/^\s*[-*]\s*\[?[ x]?\]?\s*$/gm, "")
    .replace(/^\s*\*\*[^*]+:\*\*\s*$/gm, "")
    .replace(/^\s*\d+\.\s*$/gm, "");
  return stripped.replace(/[\s>#*_-]/g, "").length > 0;
};

/** Marks for a set of period keys of one kind (one range query, shared refresh event). */
export function usePeriodNoteMarks(kind: PeriodKind, dates: string[]): Map<string, PeriodNoteMark> {
  const [marks, setMarks] = useState<Map<string, PeriodNoteMark>>(new Map());
  const sig = dates.join("|");
  const from = useMemo(() => (dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null), [sig]);
  const to = useMemo(() => (dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null), [sig]);

  const load = useCallback(async () => {
    if (!from || !to) { setMarks(new Map()); return; }
    const { data, error } = await supabase
      .from("notes")
      .select("id,date,body")
      .eq("kind", kind)
      .gte("date", from)
      .lte("date", to)
      .limit(400);
    if (error) return;
    const next = new Map<string, PeriodNoteMark>();
    for (const r of data ?? []) {
      if (!r.date) continue;
      next.set(r.date, { id: r.id, date: r.date, written: hasWriting(r.body ?? "") });
    }
    setMarks(next);
  }, [kind, from, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const h = () => { void load(); };
    window.addEventListener(CHANGED_EVENT, h);
    return () => window.removeEventListener(CHANGED_EVENT, h);
  }, [load]);

  return marks;
}
export const useDailyNoteMarks = (dates: string[]) => usePeriodNoteMarks("daily", dates);
