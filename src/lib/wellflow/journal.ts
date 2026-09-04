/**
 * Health journal — one private, descriptive entry per day.
 *
 * How you felt in your own words, plus optional mood/energy and tags.
 * Private to the signed-in user (row-level security on the server).
 * Descriptive only: no diagnosis, no dose guidance, no outcome promises.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HealthJournalEntry {
  id: string;
  date: string;
  entry: string;
  mood: number | null;
  energy: number | null;
  tags: string[];
}

/** Suggested quick tags — free text is always allowed too. */
export const JOURNAL_TAGS = [
  "Good energy", "Tired", "Bloated", "Nausea", "Heartburn",
  "Headache", "Slept well", "Sore", "Calm", "Stressed",
];

const map = (r: any): HealthJournalEntry => ({
  id: r.id,
  date: r.date,
  entry: r.entry ?? "",
  mood: r.mood ?? null,
  energy: r.energy ?? null,
  tags: Array.isArray(r.tags) ? r.tags : [],
});

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

function useJournalBus(fn: () => void) {
  useEffect(() => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [fn]);
}

/** The journal entry for one day (or null when nothing is written yet). */
export function useHealthJournal(date: string) {
  const [entry, setEntry] = useState<HealthJournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("wellflow_journal").select("*").eq("date", date).maybeSingle();
    setEntry(data ? map(data) : null);
    setLoading(false);
  }, [date]);

  useEffect(() => { setLoading(true); void load(); }, [load]);
  useJournalBus(load);

  return { entry, loading, reload: load };
}

/** Dates in a range that already have a journal entry — used for calendar dots. */
export function useJournalDates(from: string, to: string) {
  const [dates, setDates] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("wellflow_journal").select("date").gte("date", from).lte("date", to);
    setDates(new Set((data ?? []).map((r: any) => r.date)));
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);
  useJournalBus(load);

  return dates;
}

export async function saveJournal(input: {
  date: string;
  entry: string;
  mood?: number | null;
  energy?: number | null;
  tags?: string[];
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth.user?.id;
  if (!user_id) throw new Error("Please sign in");

  const { error } = await supabase.from("wellflow_journal").upsert({
    user_id,
    date: input.date,
    entry: input.entry.slice(0, 4000),
    mood: input.mood ?? null,
    energy: input.energy ?? null,
    tags: input.tags ?? [],
  }, { onConflict: "user_id,date" });
  if (error) throw error;
  emit();
}

export async function deleteJournal(id: string) {
  const { error } = await supabase.from("wellflow_journal").delete().eq("id", id);
  if (error) throw error;
  emit();
}
