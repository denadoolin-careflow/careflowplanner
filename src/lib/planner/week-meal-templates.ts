import { useCallback, useEffect, useState } from "react";
import type { Meal } from "@/lib/types";

const KEY = "careflow:week-meal-templates:v1";

export interface WeekMealTemplateEntry {
  /** 0 = first day of the shown week … 6 = last day. */
  dayIndex: number;
  slot: Meal["slot"];
  name: string;
  ingredients?: string[];
  prepMinutes?: number | null;
}

export interface WeekMealTemplate {
  id: string;
  name: string;
  entries: WeekMealTemplateEntry[];
  createdAt: string;
}

function read(): WeekMealTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: WeekMealTemplate[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("careflow:week-meal-templates"));
}

export function useWeekMealTemplates() {
  const [templates, setTemplates] = useState<WeekMealTemplate[]>(() => read());

  useEffect(() => {
    const sync = () => setTemplates(read());
    window.addEventListener("careflow:week-meal-templates", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("careflow:week-meal-templates", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((name: string, entries: WeekMealTemplateEntry[]) => {
    const tpl: WeekMealTemplate = {
      id: `wmt-${Date.now()}`,
      name,
      entries,
      createdAt: new Date().toISOString(),
    };
    write([...read(), tpl]);
    return tpl;
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter(t => t.id !== id));
  }, []);

  return { templates, save, remove };
}
