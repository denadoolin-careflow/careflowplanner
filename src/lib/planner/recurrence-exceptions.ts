import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EXCEPTIONS_CHANGED = "careflow:planner-recurrence-exceptions-changed";

export interface PlannerRecurrenceException {
  id: string;
  seriesId: string;
  occurrenceDate: string;
  action: "skip" | "override";
  overrideDate?: string;
  overrideTime?: string;
  overrideEndTime?: string;
  overridePayload: Record<string, unknown>;
}

const fromRow = (row: any): PlannerRecurrenceException => ({
  id: row.id,
  seriesId: row.series_id,
  occurrenceDate: row.occurrence_date,
  action: row.action,
  overrideDate: row.override_date ?? undefined,
  overrideTime: row.override_time ?? undefined,
  overrideEndTime: row.override_end_time ?? undefined,
  overridePayload: row.override_payload ?? {},
});

export function usePlannerRecurrenceExceptions(fromISO: string, toISO: string) {
  const [exceptions, setExceptions] = useState<PlannerRecurrenceException[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => void supabase.from("planner_recurrence_exceptions").select("*")
      .gte("occurrence_date", fromISO).lte("occurrence_date", toISO)
      .then(({ data }) => { if (active) setExceptions((data ?? []).map(fromRow)); });
    load();
    window.addEventListener(EXCEPTIONS_CHANGED, load);
    return () => { active = false; window.removeEventListener(EXCEPTIONS_CHANGED, load); };
  }, [fromISO, toISO]);
  return exceptions;
}

export async function saveOccurrenceOverride(input: {
  seriesId: string;
  occurrenceDate: string;
  overrideDate?: string;
  overrideTime?: string | null;
  overrideEndTime?: string | null;
  overridePayload?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("planner_recurrence_exceptions").upsert({
    user_id: user.id,
    series_id: input.seriesId,
    occurrence_date: input.occurrenceDate,
    action: "override",
    override_date: input.overrideDate ?? null,
    override_time: input.overrideTime ?? null,
    override_end_time: input.overrideEndTime ?? null,
    override_payload: (input.overridePayload ?? {}) as any,
  }, { onConflict: "user_id,series_id,occurrence_date" });
  if (!error) window.dispatchEvent(new Event(EXCEPTIONS_CHANGED));
  return !error;
}

export async function skipOccurrence(seriesId: string, occurrenceDate: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("planner_recurrence_exceptions").upsert({
    user_id: user.id, series_id: seriesId, occurrence_date: occurrenceDate,
    action: "skip", override_payload: {},
  }, { onConflict: "user_id,series_id,occurrence_date" });
  if (!error) window.dispatchEvent(new Event(EXCEPTIONS_CHANGED));
  return !error;
}

export function exceptionFor(exceptions: PlannerRecurrenceException[], seriesId: string | undefined, date: string) {
  if (!seriesId) return undefined;
  return exceptions.find(item => item.seriesId === seriesId && item.occurrenceDate === date);
}