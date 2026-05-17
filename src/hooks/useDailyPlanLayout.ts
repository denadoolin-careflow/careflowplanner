import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WidgetTheme } from "@/lib/widget-themes";

export type DailyWidgetId =
  | "intention" | "topThree" | "priorities" | "schedule" | "meals"
  | "homeReset" | "checkIn" | "moonCycle" | "weather" | "reflection";

export interface DailyWidgetCfg {
  id: DailyWidgetId;
  hidden?: boolean;
  theme?: WidgetTheme | null;
}

export const DEFAULT_DAILY_WIDGETS: DailyWidgetCfg[] = [
  { id: "intention" },
  { id: "topThree" },
  { id: "priorities" },
  { id: "checkIn" },
  { id: "moonCycle" },
  { id: "weather" },
  { id: "schedule" },
  { id: "meals" },
  { id: "homeReset" },
  { id: "reflection" },
];

function merge(saved: DailyWidgetCfg[] | null): DailyWidgetCfg[] {
  if (!saved || !saved.length) return DEFAULT_DAILY_WIDGETS;
  const known = new Set(DEFAULT_DAILY_WIDGETS.map(w => w.id));
  const seen = new Set<string>();
  const cleaned = saved.filter(w => known.has(w.id) && !seen.has(w.id) && (seen.add(w.id), true));
  // append any newly added defaults at the end
  for (const d of DEFAULT_DAILY_WIDGETS) if (!seen.has(d.id)) cleaned.push(d);
  return cleaned;
}

export function useDailyPlanLayout() {
  const [widgets, setWidgets] = useState<DailyWidgetCfg[]>(DEFAULT_DAILY_WIDGETS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { setLoaded(true); return; }
      const { data } = await supabase.from("daily_plan_layouts").select("widgets").eq("user_id", uid).maybeSingle();
      setWidgets(merge((data?.widgets as any) ?? null));
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next: DailyWidgetCfg[]) => {
    setWidgets(next);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    await supabase.from("daily_plan_layouts").upsert({ user_id: uid, widgets: next as any }, { onConflict: "user_id" });
  }, []);

  const update = useCallback((id: DailyWidgetId, patch: Partial<DailyWidgetCfg>) => {
    void persist(widgets.map(w => w.id === id ? { ...w, ...patch } : w));
  }, [widgets, persist]);

  const move = useCallback((id: DailyWidgetId, dir: -1 | 1) => {
    const idx = widgets.findIndex(w => w.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= widgets.length) return;
    const next = widgets.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    void persist(next);
  }, [widgets, persist]);

  const reset = useCallback(() => persist(DEFAULT_DAILY_WIDGETS), [persist]);

  return { widgets, loaded, update, move, reset };
}