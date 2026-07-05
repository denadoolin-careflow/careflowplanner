import { useMemo } from "react";
import type { WidgetInstance } from "@/lib/dashboard-layouts";
import type { WidgetTheme } from "@/lib/widget-themes";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { WidgetFrame } from "./WidgetFrame";
import { cn } from "@/lib/utils";

/** Category buckets used to arrange widgets in Kanban columns / Timeline rows.
 *  Keep in sync with AddWidgetSheet's CATEGORY_OF map. */
const CATEGORY_OF: Record<string, string> = {
  top3: "Focus", "task-progress": "Focus", pomodoro: "Focus", rhythm: "Focus",
  "todays-focus": "Focus", "who-needs-me": "Focus", "mental-load-dump": "Focus", "mom-checkin": "Focus",
  "appointments-today": "Calendar", "upcoming-snapshot": "Calendar", birthdays: "Calendar",
  holidays: "Calendar", weather: "Calendar",
  "meals-today": "Meals", "whats-for-dinner": "Meals", "pantry-status": "Meals",
  "grocery-list-mini": "Meals", "low-stock": "Meals",
  "home-reset": "Home", "home-reset-checklist": "Home", "weekly-reset": "Home",
  "chore-today": "Home", "home-overdue": "Home", "home-reset-quick": "Home", "family-tasks": "Home",
  "care-checkins": "Care", "habits-today": "Care", "health-checkin": "Care",
  "weight-trend": "Care", "movement-week": "Care", cycle: "Care",
  "budget-summary": "Wealth", "upcoming-bills": "Wealth", "debt-progress": "Wealth",
  moon: "Cosmic", "moon-guidance-hero": "Cosmic", "rhythm-forecast": "Cosmic",
  "transits-today": "Cosmic", "lunar-planner": "Cosmic", "carey-snapshot": "Cosmic", "transit-remember": "Cosmic",
  goals: "Reflect", ideas: "Reflect", "journal-prompt": "Reflect", "soft-moment": "Reflect",
  note: "Notes", "mini-tasks": "Notes",
};

const KANBAN_COLUMNS = [
  { id: "Focus", label: "🎯 Focus" },
  { id: "Care", label: "💗 Care & health" },
  { id: "Home", label: "🏡 Home & family" },
  { id: "Cosmic", label: "🌙 Cosmic & reflect" },
] as const;

/** Group all other categories under a matching kanban column so nothing is lost. */
const KANBAN_FALLBACK: Record<string, string> = {
  Calendar: "Focus", Meals: "Home", Wealth: "Home", Reflect: "Cosmic", Notes: "Focus",
};

const TIMELINE_BANDS = [
  { id: "morning", label: "☀️ Morning", cats: ["Focus", "Care", "Cosmic"] },
  { id: "midday", label: "🍽️ Midday", cats: ["Meals", "Home", "Calendar"] },
  { id: "evening", label: "🌙 Evening", cats: ["Reflect", "Wealth", "Notes"] },
] as const;

interface Props {
  mode: "kanban" | "timeline";
  widgets: WidgetInstance[];
  pageTheme?: WidgetTheme | null;
  editing: boolean;
  onHide: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onUpdateProps: (id: string, next: Record<string, any>) => void;
  onQuickAdd: (event: string) => void;
}

/** Renders the customizable dashboard in an alternate layout mode.
 *  Widgets are grouped by category into columns (Kanban) or bands (Timeline).
 *  This is a presentation-only view — the underlying widget instances and
 *  their freeform grid coordinates are untouched. */
export function AlternateLayout({
  mode, widgets, pageTheme, editing,
  onHide, onRemove, onToggleCollapse, onUpdateProps, onQuickAdd,
}: Props) {
  const byCat = useMemo(() => {
    const map = new Map<string, WidgetInstance[]>();
    for (const w of widgets) {
      const cat = CATEGORY_OF[w.type] ?? "Notes";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(w);
    }
    return map;
  }, [widgets]);

  const renderCard = (w: WidgetInstance) => {
    const spec = WIDGET_REGISTRY[w.type];
    if (!spec) return null;
    const Comp = spec.Component;
    return (
      <div key={w.id} className="min-h-[220px]">
        <WidgetFrame
          title={spec.title}
          icon={spec.icon}
          editing={editing}
          bare={spec.bare}
          pageTheme={pageTheme}
          widgetTheme={w.theme}
          pageHref={spec.pageHref}
          onQuickAdd={spec.quickAddEvent ? () => onQuickAdd(spec.quickAddEvent!) : undefined}
          collapsed={!spec.bare && !!w.collapsed}
          onToggleCollapse={spec.bare ? undefined : () => onToggleCollapse(w.id)}
          onHide={() => onHide(w.id)}
          onRemove={() => onRemove(w.id)}
        >
          <Comp props={w.props} onChange={(next: Record<string, any>) => onUpdateProps(w.id, next)} />
        </WidgetFrame>
      </div>
    );
  };

  if (mode === "kanban") {
    // Bucket every category into one of the 4 fixed columns.
    const columnItems = KANBAN_COLUMNS.map((col) => {
      const cats = [col.id, ...Object.entries(KANBAN_FALLBACK).filter(([, target]) => target === col.id).map(([k]) => k)];
      const items = cats.flatMap((c) => byCat.get(c) ?? []);
      return { ...col, items };
    });
    return (
      <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
        {columnItems.map((col) => (
          <section key={col.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <header className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {col.label} <span className="opacity-60">· {col.items.length}</span>
            </header>
            <div className="flex flex-col gap-3">
              {col.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
                  Nothing here yet.
                </p>
              ) : (
                col.items.map(renderCard)
              )}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Timeline mode: 3 horizontal bands of the day, each a responsive grid.
  return (
    <div className="space-y-6">
      {TIMELINE_BANDS.map((band) => {
        const items = band.cats.flatMap((c) => byCat.get(c) ?? []);
        if (!items.length) return null;
        return (
          <section key={band.id}>
            <header className="mb-3 flex items-center gap-3">
              <h3 className="font-display text-lg font-semibold">{band.label}</h3>
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </header>
            <div className={cn("grid gap-4", items.length > 1 ? "lg:grid-cols-3 md:grid-cols-2" : "")}>
              {items.map(renderCard)}
            </div>
          </section>
        );
      })}
    </div>
  );
}