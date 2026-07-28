import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TemplateDayPart = "morning" | "afternoon" | "evening";

export interface TemplateItem {
  title: string;
  /** Optional fixed start time "HH:MM". When absent the day part decides placement. */
  startTime?: string;
  dayPart?: TemplateDayPart;
  durMin: number;
  area?: string;
  energy?: "low" | "medium" | "high";
}

export interface PlannerTemplate {
  id: string;
  name: string;
  icon?: string | null;
  items: TemplateItem[];
  sortOrder: number;
  /** Built-in starters aren't persisted until edited. */
  builtIn?: boolean;
}

export const BUILT_IN_TEMPLATES: PlannerTemplate[] = [
  {
    id: "builtin-school-day",
    name: "School day",
    icon: "🎒",
    sortOrder: 0,
    builtIn: true,
    items: [
      { title: "Wake + morning routine", startTime: "06:30", durMin: 30, dayPart: "morning", area: "Personal", energy: "medium" },
      { title: "Breakfast + lunches packed", startTime: "07:00", durMin: 30, dayPart: "morning", area: "Meals" },
      { title: "School drop-off", startTime: "07:45", durMin: 30, dayPart: "morning", area: "Kids" },
      { title: "Focus block", startTime: "09:00", durMin: 90, dayPart: "morning", area: "Personal", energy: "high" },
      { title: "Lunch", startTime: "12:00", durMin: 30, dayPart: "afternoon", area: "Meals" },
      { title: "Admin + errands", startTime: "13:00", durMin: 60, dayPart: "afternoon", area: "Home", energy: "medium" },
      { title: "School pick-up", startTime: "15:00", durMin: 45, dayPart: "afternoon", area: "Kids" },
      { title: "Homework + snacks", startTime: "16:00", durMin: 45, dayPart: "afternoon", area: "Kids" },
      { title: "Dinner", startTime: "17:30", durMin: 60, dayPart: "evening", area: "Meals" },
      { title: "Bedtime routine", startTime: "19:30", durMin: 45, dayPart: "evening", area: "Kids", energy: "low" },
    ],
  },
  {
    id: "builtin-appointment-day",
    name: "Appointment day",
    icon: "🩺",
    sortOrder: 1,
    builtIn: true,
    items: [
      { title: "Slow start + meds check", startTime: "08:00", durMin: 30, dayPart: "morning", area: "Health", energy: "low" },
      { title: "Gather paperwork & questions", startTime: "09:00", durMin: 30, dayPart: "morning", area: "Caregiving", energy: "medium" },
      { title: "Travel to appointment", startTime: "10:00", durMin: 30, dayPart: "morning", area: "Appointments" },
      { title: "Appointment", startTime: "10:30", durMin: 90, dayPart: "morning", area: "Appointments" },
      { title: "Lunch + decompress", startTime: "12:30", durMin: 45, dayPart: "afternoon", area: "Meals", energy: "low" },
      { title: "Write up notes & next steps", startTime: "14:00", durMin: 30, dayPart: "afternoon", area: "Caregiving", energy: "medium" },
      { title: "Easy dinner", startTime: "17:30", durMin: 45, dayPart: "evening", area: "Meals" },
      { title: "Rest + early wind-down", startTime: "20:00", durMin: 60, dayPart: "evening", area: "Personal", energy: "low" },
    ],
  },
  {
    id: "builtin-low-energy-day",
    name: "Low-energy day",
    icon: "🌙",
    sortOrder: 2,
    builtIn: true,
    items: [
      { title: "Gentle wake-up", startTime: "08:30", durMin: 30, dayPart: "morning", area: "Personal", energy: "low" },
      { title: "One small win", startTime: "10:00", durMin: 30, dayPart: "morning", area: "Home", energy: "low" },
      { title: "Easy lunch", startTime: "12:30", durMin: 30, dayPart: "afternoon", area: "Meals" },
      { title: "Rest / nap", startTime: "13:30", durMin: 60, dayPart: "afternoon", area: "Health", energy: "low" },
      { title: "Fresh air walk", startTime: "15:30", durMin: 20, dayPart: "afternoon", area: "Health", energy: "low" },
      { title: "Simple dinner", startTime: "18:00", durMin: 45, dayPart: "evening", area: "Meals" },
      { title: "Wind-down ritual", startTime: "20:30", durMin: 45, dayPart: "evening", area: "Personal", energy: "low" },
    ],
  },
];

const fromRow = (r: any): PlannerTemplate => ({
  id: r.id,
  name: r.name,
  icon: r.icon ?? null,
  items: Array.isArray(r.items) ? (r.items as TemplateItem[]) : [],
  sortOrder: r.sort_order ?? 0,
});

export function usePlannerTemplates() {
  const [saved, setSaved] = useState<PlannerTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("planner_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    setSaved((data ?? []).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (name: string, items: TemplateItem[], icon?: string) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from("planner_templates")
      .insert({ user_id: uid, name, items: items as any, icon: icon ?? null })
      .select()
      .single();
    if (error || !data) return null;
    const tpl = fromRow(data);
    setSaved(prev => [...prev, tpl]);
    return tpl;
  }, []);

  const remove = useCallback(async (id: string) => {
    setSaved(prev => prev.filter(t => t.id !== id));
    await supabase.from("planner_templates").delete().eq("id", id);
  }, []);

  return { templates: [...BUILT_IN_TEMPLATES, ...saved], saved, loading, create, remove, reload: load };
}