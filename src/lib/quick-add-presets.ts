import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QuickAddKind =
  | "task" | "appointment" | "meal" | "habit" | "idea" | "journal"
  | "cleaning" | "care" | "birthday" | "holiday" | "focus" | "bookmark";

export interface QuickAddPreset {
  id: string;
  kind: QuickAddKind;
  label: string;
  icon?: string | null;
  color?: string | null;
  defaultArea?: string | null;
  templateBody?: string | null;
  hotkey?: string | null;
  pinned: boolean;
  sortOrder: number;
}

export const DEFAULT_PRESETS: Omit<QuickAddPreset, "id">[] = [
  { kind: "task",        label: "Task",          icon: "CheckSquare",   color: "primary",     pinned: true,  sortOrder: 0,  hotkey: "t", defaultArea: null, templateBody: null },
  { kind: "appointment", label: "Appointment",   icon: "CalendarHeart", color: "accent",      pinned: true,  sortOrder: 1,  hotkey: "a", defaultArea: null, templateBody: null },
  { kind: "journal",     label: "Journal",       icon: "NotebookPen",   color: "moon",        pinned: true,  sortOrder: 2,  hotkey: "j", defaultArea: null, templateBody: null },
  { kind: "meal",        label: "Meal",          icon: "Soup",          color: "secondary",   pinned: true,  sortOrder: 3,  hotkey: "m", defaultArea: "Meals", templateBody: null },
  { kind: "habit",       label: "Habit",         icon: "Flame",         color: "primary",     pinned: false, sortOrder: 4,  hotkey: "h", defaultArea: null, templateBody: null },
  { kind: "idea",        label: "Idea",          icon: "Lightbulb",     color: "accent",      pinned: false, sortOrder: 5,  hotkey: "i", defaultArea: null, templateBody: null },
  { kind: "cleaning",    label: "Cleaning task", icon: "Sparkle",       color: "moon",        pinned: false, sortOrder: 6,  hotkey: "c", defaultArea: "Home", templateBody: null },
  { kind: "care",        label: "Care note",     icon: "HeartHandshake",color: "primary",     pinned: false, sortOrder: 7,  hotkey: "n", defaultArea: "Caregiving", templateBody: null },
  { kind: "birthday",    label: "Birthday",      icon: "Cake",          color: "accent",      pinned: false, sortOrder: 8,  hotkey: "b", defaultArea: null, templateBody: null },
  { kind: "holiday",     label: "Holiday",       icon: "Sparkles",      color: "secondary",   pinned: false, sortOrder: 9,  hotkey: "y", defaultArea: null, templateBody: null },
];

function rowToPreset(r: any): QuickAddPreset {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    icon: r.icon,
    color: r.color,
    defaultArea: r.default_area,
    templateBody: r.template_body,
    hotkey: r.hotkey,
    pinned: !!r.pinned,
    sortOrder: r.sort_order ?? 0,
  };
}

export function useQuickAddPresets() {
  const [presets, setPresets] = useState<QuickAddPreset[]>(
    DEFAULT_PRESETS.map((p, i) => ({ id: `default-${p.kind}`, ...p }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("quick_add_presets")
        .select("*")
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setPresets(data.map(rowToPreset));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { presets, loading };
}
