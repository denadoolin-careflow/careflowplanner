import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDailyNote, updateNote, type Note } from "@/lib/notes";

/* ------------------------------------------------------------------ */
/* Daily note templates                                                */
/* ------------------------------------------------------------------ */

export interface DailyTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Markdown body for the given day. */
  build: (dateISO: string) => string;
}

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

export const getDailyTemplate = (id: string | null | undefined) =>
  DAILY_TEMPLATES.find(t => t.id === id) ?? null;

const PREF_KEY = "careflow:daily-note-template:v1";

/** The user's preferred default daily-note layout. */
export function useDefaultDailyTemplate(): [string, (id: string) => void] {
  const [id, setId] = useState<string>("morning");
  useEffect(() => {
    try {
      const v = localStorage.getItem(PREF_KEY);
      if (v && getDailyTemplate(v)) setId(v);
    } catch { /* ignore */ }
  }, []);
  const set = useCallback((next: string) => {
    setId(next);
    try { localStorage.setItem(PREF_KEY, next); } catch { /* ignore */ }
  }, []);
  return [id, set];
}

export const readDefaultDailyTemplate = (): string => {
  try { return localStorage.getItem(PREF_KEY) || "morning"; } catch { return "morning"; }
};

const isEmptyBody = (body: string) => body.replace(/[#\s>*-]/g, "").trim().length === 0;

/**
 * Open (or create) a day's note, seeding the chosen layout when the note is
 * still empty. Never overwrites writing that already exists.
 */
export async function openDailyNoteWithTemplate(dateISO: string, templateId?: string | null): Promise<Note> {
  const note = await getOrCreateDailyNote(dateISO);
  const tpl = getDailyTemplate(templateId ?? null);
  if (tpl && isEmptyBody(note.body)) {
    const body = tpl.build(dateISO);
    await updateNote(note.id, { body });
    note.body = body;
  }
  notifyDailyNotesChanged();
  return note;
}

/* ------------------------------------------------------------------ */
/* "Did I write today?" marks for planner cells                        */
/* ------------------------------------------------------------------ */

export interface DailyNoteMark {
  id: string;
  date: string;
  /** Has real content beyond the seeded headings. */
  written: boolean;
}

const CHANGED_EVENT = "careflow:daily-notes:changed";
export const notifyDailyNotesChanged = () => {
  try { window.dispatchEvent(new Event(CHANGED_EVENT)); } catch { /* ignore */ }
};

const hasWriting = (body: string) => {
  const stripped = body
    .split("\n")
    .filter(l => !/^\s*#{1,6}\s/.test(l))
    .join("\n")
    .replace(/^\s*[-*]\s*\[?[ x]?\]?\s*$/gm, "")
    .replace(/^\s*\*\*[^*]+:\*\*\s*$/gm, "")
    .replace(/^\s*\d+\.\s*$/gm, "");
  return stripped.replace(/[\s>#*_-]/g, "").length > 0;
};

/** Marks for a set of ISO dates (one range query, shared refresh event). */
export function useDailyNoteMarks(dates: string[]): Map<string, DailyNoteMark> {
  const [marks, setMarks] = useState<Map<string, DailyNoteMark>>(new Map());
  const from = useMemo(() => (dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null), [dates.join("|")]);
  const to = useMemo(() => (dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null), [dates.join("|")]);

  const load = useCallback(async () => {
    if (!from || !to) { setMarks(new Map()); return; }
    const { data, error } = await supabase
      .from("notes")
      .select("id,date,body")
      .eq("kind", "daily")
      .gte("date", from)
      .lte("date", to)
      .limit(400);
    if (error) return;
    const next = new Map<string, DailyNoteMark>();
    for (const r of data ?? []) {
      if (!r.date) continue;
      next.set(r.date, { id: r.id, date: r.date, written: hasWriting(r.body ?? "") });
    }
    setMarks(next);
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const h = () => { void load(); };
    window.addEventListener(CHANGED_EVENT, h);
    return () => window.removeEventListener(CHANGED_EVENT, h);
  }, [load]);

  return marks;
}
