import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimeBlock {
  id: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  title: string;
  icon?: string | null;
  notes?: string | null;
  color: string;       // semantic token name: primary | secondary | accent | moon | warm
  allDay: boolean;
  taskId?: string | null;
}

const COLORS = ["primary", "secondary", "accent", "moon", "warm"] as const;
export type BlockColor = typeof COLORS[number];
export const BLOCK_COLORS = COLORS;

function fromRow(r: any): TimeBlock {
  return {
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    title: r.title,
    icon: r.icon ?? null,
    notes: r.notes,
    color: r.color,
    allDay: r.all_day,
    taskId: r.task_id ?? null,
  };
}

export function useTimeBlocks(rangeFromISO?: string, rangeToISO?: string) {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let q = supabase.from("time_blocks").select("*").order("start_time");
    if (rangeFromISO) q = q.gte("date", rangeFromISO);
    if (rangeToISO) q = q.lte("date", rangeToISO);
    const { data, error } = await q;
    if (!error && data) setBlocks(data.map(fromRow));
    setLoading(false);
  }, [rangeFromISO, rangeToISO]);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = async (b: Omit<TimeBlock, "id">) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase.from("time_blocks").insert({
      user_id: u.user.id,
      date: b.date,
      start_time: b.startTime,
      end_time: b.endTime,
      title: b.title,
      icon: b.icon ?? null,
      notes: b.notes ?? null,
      color: b.color,
      all_day: b.allDay,
      task_id: b.taskId ?? null,
    }).select("*").single();
    if (!error && data) setBlocks(prev => [...prev, fromRow(data)]);
  };

  const update = async (id: string, patch: Partial<TimeBlock>) => {
    const dbPatch: any = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.icon !== undefined) dbPatch.icon = patch.icon ?? null;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
    if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.date !== undefined) dbPatch.date = patch.date;
    if (patch.allDay !== undefined) dbPatch.all_day = patch.allDay;
    if (patch.taskId !== undefined) dbPatch.task_id = patch.taskId;
    const { data, error } = await supabase.from("time_blocks").update(dbPatch).eq("id", id).select("*").single();
    if (!error && data) setBlocks(prev => prev.map(b => b.id === id ? fromRow(data) : b));
  };

  const remove = async (id: string) => {
    await supabase.from("time_blocks").delete().eq("id", id);
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  return { blocks, loading, add, update, remove, refresh };
}

export function colorClasses(c: string): { bg: string; ring: string; text: string; style?: CSSProperties } {
  if (typeof c === "string" && c.startsWith("#")) {
    return {
      bg: "",
      ring: "ring-transparent",
      text: "text-foreground",
      style: {
        backgroundColor: `${c}22`,
        borderColor: c,
        boxShadow: `inset 0 0 0 1px ${c}55`,
      },
    };
  }
  switch (c) {
    case "secondary": return { bg: "bg-secondary-soft", ring: "ring-secondary", text: "text-secondary-foreground" };
    case "accent":    return { bg: "bg-accent-soft",    ring: "ring-accent",    text: "text-accent-foreground" };
    case "moon":      return { bg: "bg-moon-soft",      ring: "ring-moon",      text: "text-moon-foreground" };
    case "warm":      return { bg: "bg-warm-soft",      ring: "ring-warm",      text: "text-warm-foreground" };
    default:          return { bg: "bg-primary-soft",   ring: "ring-primary",   text: "text-foreground" };
  }
}

/** Convert HH:MM to fractional hours (6.5 = 6:30). */
export function hmToHours(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}
export function hoursToHM(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
