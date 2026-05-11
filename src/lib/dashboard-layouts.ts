import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WidgetType =
  | "note"
  | "mini-tasks"
  | "top3"
  | "weather"
  | "moon"
  | "pomodoro"
  | "task-progress"
  | "appointments-today"
  | "meals-today"
  | "habits-today"
  | "rhythm"
  | "family-tasks"
  | "care-checkins"
  | "home-reset"
  | "birthdays"
  | "holidays"
  | "weekly-reset"
  | "goals"
  | "ideas"
  | "journal-prompt"
  | "soft-moment"
  | "health-checkin"
  | "weight-trend"
  | "movement-week"
  | "budget-summary"
  | "upcoming-bills"
  | "debt-progress"
  | "chore-today"
  | "home-overdue";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  props?: Record<string, any>;
  hidden?: boolean;
}

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardLayoutData {
  widgets: WidgetInstance[];
  layout: GridItem[];
}

const uid = () =>
  (crypto as any)?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const PAGE_KEYS = ["home", "today", "week"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/**
 * Default widget set per page. Layout uses a 12-col grid; each unit ~ rowHeight (handled in CustomizableGrid).
 */
export function defaultLayout(page: PageKey): DashboardLayoutData {
  if (page === "home") {
    const items: { type: WidgetType; w: number; h: number }[] = [
      { type: "task-progress", w: 6, h: 4 },
      { type: "pomodoro", w: 6, h: 4 },
      { type: "weather", w: 8, h: 5 },
      { type: "moon", w: 4, h: 5 },
      { type: "top3", w: 4, h: 5 },
      { type: "rhythm", w: 4, h: 5 },
      { type: "appointments-today", w: 4, h: 5 },
      { type: "meals-today", w: 4, h: 5 },
      { type: "habits-today", w: 4, h: 5 },
      { type: "home-reset", w: 4, h: 5 },
      { type: "family-tasks", w: 4, h: 5 },
      { type: "care-checkins", w: 4, h: 5 },
      { type: "birthdays", w: 4, h: 5 },
      { type: "holidays", w: 4, h: 5 },
      { type: "goals", w: 4, h: 5 },
      { type: "ideas", w: 4, h: 5 },
      { type: "weekly-reset", w: 4, h: 5 },
      { type: "journal-prompt", w: 4, h: 5 },
      { type: "soft-moment", w: 4, h: 5 },
    ];
    return packLayout(items);
  }
  if (page === "today") {
    return packLayout([
      { type: "task-progress", w: 6, h: 4 },
      { type: "pomodoro", w: 6, h: 4 },
      { type: "top3", w: 6, h: 5 },
      { type: "appointments-today", w: 6, h: 5 },
      { type: "meals-today", w: 6, h: 5 },
      { type: "habits-today", w: 6, h: 5 },
      { type: "note", w: 6, h: 5, props: { title: "Today's notes", body: "" } } as any,
      { type: "mini-tasks", w: 6, h: 5, props: { title: "Quick list", items: [] } } as any,
    ]);
  }
  // week
  return packLayout([
    { type: "task-progress", w: 12, h: 4 },
    { type: "weather", w: 8, h: 5 },
    { type: "moon", w: 4, h: 5 },
    { type: "weekly-reset", w: 6, h: 5 },
    { type: "habits-today", w: 6, h: 5 },
    { type: "note", w: 6, h: 5, props: { title: "Week notes", body: "" } } as any,
    { type: "mini-tasks", w: 6, h: 5, props: { title: "Week wishlist", items: [] } } as any,
  ]);
}

function packLayout(
  items: { type: WidgetType; w: number; h: number; props?: Record<string, any> }[],
): DashboardLayoutData {
  const cols = 12;
  let x = 0;
  let y = 0;
  let rowH = 0;
  const widgets: WidgetInstance[] = [];
  const layout: GridItem[] = [];
  for (const it of items) {
    if (x + it.w > cols) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    const id = uid();
    widgets.push({ id, type: it.type, props: it.props });
    layout.push({ i: id, x, y, w: it.w, h: it.h, minW: 3, minH: 3 });
    x += it.w;
    rowH = Math.max(rowH, it.h);
  }
  return { widgets, layout };
}

/* ------------ persistence ------------ */

async function fetchRow(page: PageKey) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("name", page)
    .maybeSingle();
  return data;
}

async function upsertRow(page: PageKey, data: DashboardLayoutData) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const existing = await fetchRow(page);
  const payload = {
    user_id: auth.user.id,
    name: page,
    layout: data.layout as any,
    widgets: data.widgets as any,
    is_active: true,
  };
  if (existing) {
    await supabase.from("dashboard_layouts").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("dashboard_layouts").insert(payload);
  }
}

export function useDashboardLayout(page: PageKey) {
  const [data, setData] = useState<DashboardLayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await fetchRow(page);
      if (cancelled) return;
      if (row && Array.isArray((row as any).widgets) && (row as any).widgets.length) {
        setData({
          widgets: (row as any).widgets,
          layout: (row as any).layout ?? [],
        });
      } else {
        const def = defaultLayout(page);
        setData(def);
        // seed
        upsertRow(page, def).catch(() => {});
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const save = useCallback(
    (next: DashboardLayoutData) => {
      setData(next);
      upsertRow(page, next).catch(() => {});
    },
    [page],
  );

  const updateLayout = useCallback(
    (layout: GridItem[]) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, layout };
        upsertRow(page, next).catch(() => {});
        return next;
      });
    },
    [page],
  );

  const addWidget = useCallback(
    (type: WidgetType, defaultSize: { w: number; h: number }, props?: Record<string, any>) => {
      setData((prev) => {
        const base = prev ?? { widgets: [], layout: [] };
        const id = uid();
        const widgets = [...base.widgets, { id, type, props }];
        const maxY = base.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
        const layout = [
          ...base.layout,
          { i: id, x: 0, y: maxY, w: defaultSize.w, h: defaultSize.h, minW: 3, minH: 3 },
        ];
        const next = { widgets, layout };
        upsertRow(page, next).catch(() => {});
        return next;
      });
    },
    [page],
  );

  const removeWidget = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          widgets: prev.widgets.filter((w) => w.id !== id),
          layout: prev.layout.filter((l) => l.i !== id),
        };
        upsertRow(page, next).catch(() => {});
        return next;
      });
    },
    [page],
  );

  const hideWidget = useCallback(
    (id: string, hidden = true) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          widgets: prev.widgets.map((w) => (w.id === id ? { ...w, hidden } : w)),
        };
        upsertRow(page, next).catch(() => {});
        return next;
      });
    },
    [page],
  );

  const updateWidgetProps = useCallback(
    (id: string, props: Record<string, any>) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          widgets: prev.widgets.map((w) =>
            w.id === id ? { ...w, props: { ...(w.props ?? {}), ...props } } : w,
          ),
        };
        upsertRow(page, next).catch(() => {});
        return next;
      });
    },
    [page],
  );

  const resetToDefault = useCallback(() => {
    const def = defaultLayout(page);
    setData(def);
    upsertRow(page, def).catch(() => {});
  }, [page]);

  return {
    data,
    loading,
    save,
    updateLayout,
    addWidget,
    removeWidget,
    hideWidget,
    updateWidgetProps,
    resetToDefault,
  };
}