import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    void supabase.from("planner_recurrence_exceptions").select("*")
      .gte("occurrence_date", fromISO).lte("occurrence_date", toISO)
      .then(({ data }) => { if (active) setExceptions((data ?? []).map(fromRow)); });
    return () => { active = false; };
  }, [fromISO, toISO]);
  return exceptions;
}

export function exceptionFor(exceptions: PlannerRecurrenceException[], seriesId: string | undefined, date: string) {
  if (!seriesId) return undefined;
  return exceptions.find(item => item.seriesId === seriesId && item.occurrenceDate === date);
}