import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, EyeOff, GripVertical, RotateCcw, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { TodaysRhythmCard } from "./TodaysRhythmCard";
import { TasksTodayWidget } from "@/components/today/widgets/TasksTodayWidget";
import { FamilySnapshotCard } from "@/components/today/rhythm/FamilySnapshotCard";
import { MealsPlannedWidget } from "@/components/today/widgets/MealsPlannedWidget";
import { CycleSidebarCard } from "@/components/today/widgets/CycleSidebarCard";
import { MoonPhaseSidebarCard } from "@/components/today/widgets/MoonPhaseSidebarCard";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { NotesTodayWidget } from "@/components/today/widgets/NotesTodayWidget";
import { JournalTodayWidget } from "@/components/today/widgets/JournalTodayWidget";

type WidgetId =
  | "rhythm" | "tasks" | "family" | "meals"
  | "cycle" | "moon" | "weather" | "notes" | "journal";

const DEFAULT_ORDER: WidgetId[] = [
  "rhythm", "tasks", "family", "meals", "cycle", "moon", "weather", "notes", "journal",
];

const WIDGET_TITLES: Record<WidgetId, string> = {
  rhythm: "Today’s Rhythm",
  tasks: "Tasks",
  family: "Family",
  meals: "Meals",
  cycle: "Cycle",
  moon: "Lunar",
  weather: "Weather",
  notes: "Notes",
  journal: "Journal",
};

const K_ORDER = "careflow:calendar:widgets:order:v1";
const K_HIDDEN = "careflow:calendar:widgets:hidden:v1";
const K_COLLAPSED = "careflow:calendar:widgets:collapsed:v1";

function readArr<T extends string>(k: string, fallback: T[]): T[] {
  try {
    const v = localStorage.getItem(k);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch { return fallback; }
}

function useWidgetLayout() {
  const [order, setOrder] = useState<WidgetId[]>(() => {
    const stored = readArr<WidgetId>(K_ORDER, DEFAULT_ORDER);
    const merged = [...stored.filter(id => DEFAULT_ORDER.includes(id)), ...DEFAULT_ORDER.filter(id => !stored.includes(id))];
    return merged as WidgetId[];
  });
  const [hidden, setHidden] = useState<Set<WidgetId>>(() => new Set(readArr<WidgetId>(K_HIDDEN, [])));
  const [collapsed, setCollapsed] = useState<Set<WidgetId>>(() => new Set(readArr<WidgetId>(K_COLLAPSED, [])));

  useEffect(() => { try { localStorage.setItem(K_ORDER, JSON.stringify(order)); } catch { /* */ } }, [order]);
  useEffect(() => { try { localStorage.setItem(K_HIDDEN, JSON.stringify(Array.from(hidden))); } catch { /* */ } }, [hidden]);
  useEffect(() => { try { localStorage.setItem(K_COLLAPSED, JSON.stringify(Array.from(collapsed))); } catch { /* */ } }, [collapsed]);

  const move = useCallback((id: WidgetId, dir: -1 | 1) => {
    setOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const j = Math.max(0, Math.min(prev.length - 1, idx + dir));
      if (j === idx) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);
  const toggleHidden = useCallback((id: WidgetId) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const toggleCollapsed = useCallback((id: WidgetId) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    setHidden(new Set());
    setCollapsed(new Set());
  }, []);

  return { order, hidden, collapsed, move, toggleHidden, toggleCollapsed, reset };
}

function Frame({
  id, title, editing, collapsed, hidden, onMoveUp, onMoveDown, onToggleCollapse, onToggleHidden, children,
}: {
  id: WidgetId;
  title: string;
  editing: boolean;
  collapsed: boolean;
  hidden: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCollapse: () => void;
  onToggleHidden: () => void;
  children: React.ReactNode;
}) {
  if (!editing && hidden) return null;
  return (
    <div className={cn("relative", editing && "rounded-2xl border border-dashed border-primary/40 p-1", hidden && "opacity-50")}>
      {editing && (
        <div className="mb-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <GripVertical className="h-3 w-3" />
          <span className="font-medium">{title}</span>
          <div className="ml-auto flex items-center gap-0.5">
            <button onClick={onMoveUp} className="rounded p-1 hover:bg-muted/60" aria-label="Move up">↑</button>
            <button onClick={onMoveDown} className="rounded p-1 hover:bg-muted/60" aria-label="Move down">↓</button>
            <button onClick={onToggleCollapse} className="rounded p-1 hover:bg-muted/60" aria-label="Collapse">
              {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button onClick={onToggleHidden} className="rounded p-1 hover:bg-muted/60" aria-label="Hide">
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      {!collapsed && children}
    </div>
  );
}

function renderWidget(id: WidgetId, date: Date): React.ReactNode {
  switch (id) {
    case "rhythm": return <TodaysRhythmCard date={date} />;
    case "tasks": return <TasksTodayWidget date={date} />;
    case "family": return <FamilySnapshotCard date={date} />;
    case "meals": return <MealsPlannedWidget date={date} />;
    case "cycle": return <CycleSidebarCard date={date} />;
    case "moon": return <MoonPhaseSidebarCard date={date} />;
    case "weather": return <WeatherWidget />;
    case "notes": return <NotesTodayWidget />;
    case "journal": return <JournalTodayWidget />;
    default: return null;
  }
}

/** Unified responsive widget rail used across mobile / tablet / desktop. */
export function WidgetRail({ date = new Date(), columns = "auto" }: { date?: Date; columns?: "auto" | "single" | "double" }) {
  const { order, hidden, collapsed, move, toggleHidden, toggleCollapsed, reset } = useWidgetLayout();
  const [editing, setEditing] = useState(false);

  const visible = useMemo(() => editing ? order : order.filter(id => !hidden.has(id)), [order, hidden, editing]);

  const gridClass =
    columns === "single" ? "grid-cols-1" :
    columns === "double" ? "grid-cols-1 md:grid-cols-2" :
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-1";

  return (
    <aside className="w-full space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Widgets
        </h2>
        <div className="flex items-center gap-1">
          {editing && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={reset}>
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          )}
          <Button
            size="sm"
            variant={editing ? "default" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => setEditing(e => !e)}
          >
            <Settings2 className="mr-1 h-3 w-3" /> {editing ? "Done" : "Edit"}
          </Button>
        </div>
      </div>
      <div className={cn("grid gap-3", gridClass)}>
        {visible.map(id => (
          <Frame
            key={id}
            id={id}
            title={WIDGET_TITLES[id]}
            editing={editing}
            collapsed={collapsed.has(id)}
            hidden={hidden.has(id)}
            onMoveUp={() => move(id, -1)}
            onMoveDown={() => move(id, 1)}
            onToggleCollapse={() => toggleCollapsed(id)}
            onToggleHidden={() => toggleHidden(id)}
          >
            {renderWidget(id, date)}
          </Frame>
        ))}
      </div>
    </aside>
  );
}