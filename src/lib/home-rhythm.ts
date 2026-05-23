import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RhythmSlot = "morning" | "afternoon" | "evening" | "night";
export type RhythmSourceType = "task" | "chore" | "routine" | "meal" | "custom";

export interface RhythmAssignment {
  id: string;
  user_id: string;
  date: string;
  slot: RhythmSlot;
  source_type: RhythmSourceType;
  source_id: string | null;
  title: string;
  notes: string | null;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const SLOTS: { id: RhythmSlot; label: string; hint: string }[] = [
  { id: "morning", label: "Morning", hint: "Wake · breakfast · launch the day" },
  { id: "afternoon", label: "Afternoon", hint: "Errands · focus · midday reset" },
  { id: "evening", label: "Evening", hint: "Dinner · family · wind down" },
  { id: "night", label: "Night Reset", hint: "Tidy · prep tomorrow · rest" },
];

export function useHomeRhythm(date: string) {
  const [items, setItems] = useState<RhythmAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("home_rhythm_assignments")
      .select("*")
      .eq("date", date)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as RhythmAssignment[]) ?? []);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const add = async (slot: RhythmSlot, title: string, source_type: RhythmSourceType = "custom", source_id: string | null = null) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const sort_order = items.filter((i) => i.slot === slot).length;
    const { error } = await supabase.from("home_rhythm_assignments").insert({
      user_id: auth.user.id, date, slot, title: title.trim(), source_type, source_id, sort_order,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const update = async (id: string, patch: Partial<RhythmAssignment>) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from("home_rhythm_assignments").update(patch).eq("id", id);
    if (error) { toast.error(error.message); load(); }
  };

  const remove = async (id: string) => {
    setItems((cur) => cur.filter((i) => i.id !== id));
    const { error } = await supabase.from("home_rhythm_assignments").delete().eq("id", id);
    if (error) { toast.error(error.message); load(); }
  };

  const move = async (id: string, slot: RhythmSlot) => {
    await update(id, { slot });
  };

  return { items, loading, add, update, remove, move, reload: load };
}