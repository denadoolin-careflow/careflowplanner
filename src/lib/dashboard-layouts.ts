import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WidgetTheme } from "./widget-themes";

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
  | "home-reset-checklist"
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
  | "home-overdue"
  | "cycle"
  | "rhythm-forecast"
  | "moon-guidance-hero"
  | "who-needs-me"
  | "todays-focus"
  | "whats-for-dinner"
  | "mental-load-dump"
  | "mom-checkin"
  | "upcoming-snapshot"
  | "home-reset-quick";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  props?: Record<string, any>;
  hidden?: boolean;
  collapsed?: boolean;
  theme?: WidgetTheme | null;
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
  pageTheme?: WidgetTheme | null;
}

const uid = () =>
  (crypto as any)?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const PAGE_KEYS = ["home", "today", "week", "home-hub", "wealth-hub"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/* Presets: stored as separate dashboard_layouts rows with name `${page}::${preset}` */
const PRESET_SEP = "::";
const rowName = (page: PageKey, preset: string) => `${page}${PRESET_SEP}${preset}`;
const DEFAULT_PRESET = "Default";

function parseRowName(name: string): { page: string; preset: string } {
  const i = name.indexOf(PRESET_SEP);
  if (i === -1) return { page: name, preset: DEFAULT_PRESET };
  return { page: name.slice(0, i), preset: name.slice(i + 2) };
}

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
      { type: "rhythm-forecast", w: 4, h: 5 },
      { type: "appointments-today", w: 4, h: 5 },
      { type: "meals-today", w: 4, h: 5 },
      { type: "habits-today", w: 4, h: 5 },
      { type: "home-reset", w: 4, h: 5 },
      { type: "home-reset-checklist", w: 8, h: 6 },
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
  if (page === "home-hub") {
    return packLayout([
      { type: "top3", w: 4, h: 5 },
      { type: "rhythm", w: 4, h: 5 },
      { type: "weekly-reset", w: 4, h: 5 },
      { type: "appointments-today", w: 4, h: 5 },
      { type: "meals-today", w: 4, h: 5 },
      { type: "home-reset", w: 4, h: 5 },
      { type: "home-reset-checklist", w: 8, h: 6 },
      { type: "chore-today", w: 4, h: 5 },
      { type: "home-overdue", w: 4, h: 5 },
      { type: "family-tasks", w: 4, h: 5 },
      { type: "care-checkins", w: 4, h: 5 },
      { type: "habits-today", w: 4, h: 5 },
      { type: "birthdays", w: 4, h: 5 },
      { type: "holidays", w: 4, h: 5 },
      { type: "weather", w: 8, h: 5 },
      { type: "moon", w: 4, h: 5 },
    ]);
  }
  if (page === "wealth-hub") {
    return packLayout([
      { type: "budget-summary", w: 4, h: 4 },
      { type: "upcoming-bills", w: 4, h: 5 },
      { type: "debt-progress", w: 4, h: 4 },
      { type: "goals", w: 4, h: 5 },
      { type: "note", w: 8, h: 5, props: { title: "Money notes", body: "" } } as any,
    ]);
  }
  if (page === "today") {
    return packLayout([
      { type: "task-progress", w: 6, h: 4 },
      { type: "pomodoro", w: 6, h: 4 },
      { type: "moon", w: 6, h: 5 },
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

async function fetchRow(page: PageKey, preset: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("name", rowName(page, preset))
    .maybeSingle();
  return data;
}

async function upsertRow(page: PageKey, preset: string, data: DashboardLayoutData) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const existing = await fetchRow(page, preset);
  const payload = {
    user_id: auth.user.id,
    name: rowName(page, preset),
    layout: { items: data.layout, pageTheme: data.pageTheme ?? null } as any,
    widgets: data.widgets as any,
    is_active: true,
  };
  if (existing) {
    await supabase.from("dashboard_layouts").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("dashboard_layouts").insert(payload);
  }
}

/** Read the JSONB `layout` column (supports both legacy array form and the new {items,pageTheme} form). */
function readLayoutCol(raw: any): { items: GridItem[]; pageTheme: WidgetTheme | null } {
  if (!raw) return { items: [], pageTheme: null };
  if (Array.isArray(raw)) return { items: raw, pageTheme: null };
  return {
    items: Array.isArray(raw.items) ? raw.items : [],
    pageTheme: raw.pageTheme ?? null,
  };
}

/* ---------- preset listing / management ---------- */

export async function listPresets(page: PageKey): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [DEFAULT_PRESET];
  const { data } = await supabase
    .from("dashboard_layouts")
    .select("name")
    .eq("user_id", auth.user.id);
  const presets = new Set<string>([DEFAULT_PRESET]);
  for (const r of data ?? []) {
    const { page: p, preset } = parseRowName((r as any).name);
    if (p === page) presets.add(preset);
  }
  return [...presets];
}

const ACTIVE_KEY = (page: PageKey) => `careflow:active-preset:${page}`;

export function getActivePreset(page: PageKey): string {
  if (typeof window === "undefined") return DEFAULT_PRESET;
  return window.localStorage.getItem(ACTIVE_KEY(page)) ?? DEFAULT_PRESET;
}

export function setActivePreset(page: PageKey, preset: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY(page), preset);
}

export function useDashboardLayout(page: PageKey) {
  const [data, setData] = useState<DashboardLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPresetState] = useState<string>(() => getActivePreset(page));
  const [presets, setPresets] = useState<string[]>([DEFAULT_PRESET]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [row, all] = await Promise.all([fetchRow(page, preset), listPresets(page)]);
      if (cancelled) return;
      setPresets(all);
      if (row && Array.isArray((row as any).widgets) && (row as any).widgets.length) {
        const lc = readLayoutCol((row as any).layout);
        const widgets: WidgetInstance[] = (row as any).widgets;
        const layout = lc.items;
        // Auto-add the Home reset checklist widget for existing users on the home page.
        if (page === "home" && !widgets.some((w) => w.type === "home-reset-checklist")) {
          const id = uid();
          widgets.push({ id, type: "home-reset-checklist" });
          const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
          layout.push({ i: id, x: 0, y: maxY, w: 8, h: 6, minW: 3, minH: 3 });
          const next = { widgets, layout, pageTheme: lc.pageTheme };
          setData(next);
          upsertRow(page, preset, next).catch(() => {});
        } else {
          setData({ widgets, layout, pageTheme: lc.pageTheme });
        }
      } else {
        const def = defaultLayout(page);
        setData(def);
        upsertRow(page, preset, def).catch(() => {});
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, preset]);

  const save = useCallback(
    (next: DashboardLayoutData) => {
      setData(next);
      upsertRow(page, preset, next).catch(() => {});
    },
    [page, preset],
  );

  const updateLayout = useCallback(
    (layout: GridItem[]) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, layout };
        upsertRow(page, preset, next).catch(() => {});
        return next;
      });
    },
    [page, preset],
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
        upsertRow(page, preset, next).catch(() => {});
        return next;
      });
    },
    [page, preset],
  );

  const removeWidget = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          widgets: prev.widgets.filter((w) => w.id !== id),
          layout: prev.layout.filter((l) => l.i !== id),
        };
        upsertRow(page, preset, next).catch(() => {});
        return next;
      });
    },
    [page, preset],
  );

  const hideWidget = useCallback(
    (id: string, hidden = true) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          widgets: prev.widgets.map((w) => (w.id === id ? { ...w, hidden } : w)),
        };
        upsertRow(page, preset, next).catch(() => {});
        return next;
      });
    },
    [page, preset],
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
        upsertRow(page, preset, next).catch(() => {});
        return next;
      });
    },
    [page, preset],
  );

  const resetToDefault = useCallback(() => {
    const def = defaultLayout(page);
    setData(def);
    upsertRow(page, preset, def).catch(() => {});
  }, [page, preset]);

  /* Theming + collapsing */
  const setPageTheme = useCallback((theme: WidgetTheme | null) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, pageTheme: theme };
      upsertRow(page, preset, next).catch(() => {});
      return next;
    });
  }, [page, preset]);

  const setWidgetTheme = useCallback((id: string, theme: WidgetTheme | null) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, theme } : w)),
      };
      upsertRow(page, preset, next).catch(() => {});
      return next;
    });
  }, [page, preset]);

  const toggleCollapsed = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, collapsed: !w.collapsed } : w)),
      };
      upsertRow(page, preset, next).catch(() => {});
      return next;
    });
  }, [page, preset]);

  /* Presets */
  const switchPreset = useCallback((name: string) => {
    setActivePreset(page, name);
    setPresetState(name);
  }, [page]);

  const createPreset = useCallback(async (name: string, copyFromCurrent = true) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const source = copyFromCurrent && data ? data : defaultLayout(page);
    await upsertRow(page, trimmed, source);
    setActivePreset(page, trimmed);
    setPresets((p) => (p.includes(trimmed) ? p : [...p, trimmed]));
    setPresetState(trimmed);
  }, [data, page]);

  const deletePreset = useCallback(async (name: string) => {
    if (name === DEFAULT_PRESET) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("dashboard_layouts").delete()
      .eq("user_id", auth.user.id).eq("name", rowName(page, name));
    setPresets((p) => p.filter((x) => x !== name));
    if (preset === name) {
      setActivePreset(page, DEFAULT_PRESET);
      setPresetState(DEFAULT_PRESET);
    }
  }, [page, preset]);

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
    setPageTheme,
    setWidgetTheme,
    toggleCollapsed,
    preset,
    presets,
    switchPreset,
    createPreset,
    deletePreset,
  };
}