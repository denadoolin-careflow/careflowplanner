import { useMemo } from "react";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, startOfWeek } from "date-fns";
import { useStore, todayISO } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { LayoutGrid, LayoutList, CalendarDays, PanelRightOpen, PanelRightClose, type LucideIcon } from "lucide-react";
import type { Task } from "@/lib/types";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { QuickEntryBar } from "@/components/tasks/QuickEntryBar";
import { TodayFocusCard } from "@/components/tasks/TodayFocusCard";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { TaskListControls, useTaskListPrefs } from "@/components/tasks/TaskListControls";
import { applyFilters, sortTasks, groupTasks } from "@/lib/task-grouping";
import { KanbanBoard, type KanbanGroupBy } from "@/components/tasks/KanbanBoard";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { TaskSelectionProvider, useTaskSelection } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane";
import { Button } from "@/components/ui/button";

type Variant = "upcoming" | "anytime" | "someday" | "logbook";
type ViewMode = "list" | "agenda" | "kanban";
type Timeframe = "all" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "thisMonth";

const META: Record<Variant, { title: string; subtitle: string }> = {
  upcoming: { title: "Upcoming", subtitle: "Scheduled for the days ahead." },
  anytime: { title: "Anytime", subtitle: "Things you can do whenever." },
  someday: { title: "Someday", subtitle: "Ideas to revisit later — no pressure." },
  logbook: { title: "Logbook", subtitle: "Everything you've completed." },
};

function filterTasks(all: Task[], variant: Variant): Task[] {
  const today = todayISO();
  const root = all.filter(t => !t.parentTaskId);
  switch (variant) {
    case "upcoming":
      return root.filter(t => !t.done && t.dueDate && t.dueDate > today && t.status !== "parked")
                 .sort((a,b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    case "anytime":
      return root.filter(t => !t.done && !t.dueDate && t.status !== "someday" && t.status !== "parked" && !t.inbox);
    case "someday":
      return root.filter(t => !t.done && t.status === "someday");
    case "logbook":
      return root.filter(t => t.done)
                 .sort((a,b) => (b.lastCompletedAt ?? "").localeCompare(a.lastCompletedAt ?? ""));
  }
}

function applyTimeframe(list: Task[], tf: Timeframe): Task[] {
  if (tf === "all") return list;
  const today = todayISO();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const wkStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const wkEnd = format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const nwStart = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1), "yyyy-MM-dd");
  const nwEnd = format(addWeeks(endOfWeek(new Date(), { weekStartsOn: 0 }), 1), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  return list.filter(t => {
    const d = t.dueDate; if (!d) return false;
    if (tf === "today") return d === today;
    if (tf === "tomorrow") return d === tomorrow;
    if (tf === "thisWeek") return d >= wkStart && d <= wkEnd;
    if (tf === "nextWeek") return d >= nwStart && d <= nwEnd;
    if (tf === "thisMonth") return d >= today && d <= monthEnd;
    return true;
  });
}

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisWeek", label: "This week" },
  { key: "nextWeek", label: "Next week" },
  { key: "thisMonth", label: "This month" },
];

export function TaskListPage({ variant, icon: Icon }: { variant: Variant; icon: LucideIcon }) {
  return (
    <TaskSelectionProvider storageKey={`tlp:${variant}`}>
      <TaskListPageInner variant={variant} icon={Icon} />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function TaskListPageInner({ variant, icon: Icon }: { variant: Variant; icon: LucideIcon }) {
  const { state } = useStore();
  const { paneOpen, togglePane, setOrderedIds, clear } = useTaskSelection();
  const [prefs, setPrefs] = useTaskListPrefs(`tlp:${variant}`);
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(`careflow:view:${variant}`) as ViewMode) || "list");
  const [timeframe, setTimeframe] = useState<Timeframe>(() => (localStorage.getItem(`careflow:tf:${variant}`) as Timeframe) || "all");
  const [kanbanGroup, setKanbanGroup] = useState<KanbanGroupBy>(() => (localStorage.getItem(`careflow:kanban-group:${variant}`) as KanbanGroupBy) || "status");
  useEffect(() => { localStorage.setItem(`careflow:view:${variant}`, view); }, [view, variant]);
  useEffect(() => { localStorage.setItem(`careflow:tf:${variant}`, timeframe); }, [timeframe, variant]);
  useEffect(() => { localStorage.setItem(`careflow:kanban-group:${variant}`, kanbanGroup); }, [kanbanGroup, variant]);
  const showTimeframe = variant === "upcoming";

  const filteredFlat = useMemo(() => {
    const base = filterTasks(state.tasks, variant);
    const tf = showTimeframe ? applyTimeframe(base, timeframe) : base;
    const filtered = applyFilters(tf, prefs.filter);
    return sortTasks(filtered, prefs.sort, prefs.sortDir);
  }, [state.tasks, variant, prefs, timeframe, showTimeframe]);

  const groups = useMemo(() => {
    const groupMode = view === "agenda" ? "date" : prefs.group;
    return groupTasks(filteredFlat, groupMode, state.projects ?? []);
  }, [filteredFlat, prefs.group, state.projects, view]);
  const total = groups.reduce((s, g) => s + g.tasks.length, 0);
  const meta = META[variant];

  useEffect(() => {
    setOrderedIds(filteredFlat.map(t => t.id));
  }, [filteredFlat, setOrderedIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const composerDefaults =
    variant === "upcoming" ? { dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd") }
    : variant === "someday" ? { status: "someday" as const }
    : {};

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.subtitle} {total} {total === 1 ? "item" : "items"}.</p>
        </div>
        <ViewToggle value={view} onChange={setView} />
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 lg:inline-flex"
          onClick={togglePane}
          title={paneOpen ? "Hide details pane" : "Show details pane"}
          aria-label="Toggle details pane"
        >
          {paneOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
        <TaskListControls prefs={prefs} onChange={setPrefs} />
      </header>

      {showTimeframe && (
        <div className="flex flex-wrap gap-1 rounded-full bg-muted/50 p-1 w-fit">
          {TIMEFRAMES.map(t => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                timeframe === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >{t.label}</button>
          ))}
        </div>
      )}

      {variant === "upcoming" && <TodayFocusCard />}

      {variant !== "logbook" && (
        <div className="space-y-2">
          <QuickEntryBar defaults={composerDefaults} placeholder={`Add to ${meta.title.toLowerCase()} — try natural language…`} />
          <details className="group">
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
              More options
            </summary>
            <div className="mt-2">
              <InlineTaskComposer defaults={composerDefaults} placeholder={`Add to ${meta.title.toLowerCase()}…`} />
            </div>
          </details>
        </div>
      )}

      {view === "kanban" ? (
        <>
          <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 w-fit text-xs">
            <span className="px-2 text-muted-foreground">Group by</span>
            {(["status", "day"] as KanbanGroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setKanbanGroup(g)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium capitalize transition-colors",
                  kanbanGroup === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >{g}</button>
            ))}
          </div>
          <KanbanBoard tasks={filteredFlat} groupBy={kanbanGroup} />
        </>
      ) : (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
        {total === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nothing here yet ✨</div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.key} className="space-y-1">
                {(view === "agenda" || prefs.group !== "none") && (
                  <div className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {g.label} <span className="opacity-60">· {g.tasks.length}</span>
                  </div>
                )}
                {g.tasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      </div>
      {paneOpen && <TaskDetailPane />}
      <UnscheduledTasksRail />
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { key: ViewMode; icon: LucideIcon; label: string }[] = [
    { key: "list", icon: LayoutList, label: "List" },
    { key: "agenda", icon: CalendarDays, label: "Agenda" },
    { key: "kanban", icon: LayoutGrid, label: "Kanban" },
  ];
  return (
    <div className="flex rounded-full bg-muted/50 p-0.5">
      {opts.map(o => {
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            title={o.label}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
              value === o.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}