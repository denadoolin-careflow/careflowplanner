import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Inbox, GripVertical, Search, X, CalendarDays, ListTodo,
  UtensilsCrossed, Repeat, Target, FolderKanban, Sparkles, Check,
  Trash2, Pencil, Minus, Plus, Pause, Play, CheckCircle2,
  Settings2, ChevronUp, ChevronDown, Eye, EyeOff, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task, Meal, Habit, Goal, Project, CleaningTask } from "@/lib/types";
import { format, parseISO, isAfter, startOfDay, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { useLongPressDrag } from "@/lib/long-press-drag";
import { Check } from "lucide-react";

export const TASK_DRAG_MIME = "application/x-careflow-task";
export const EVENT_DRAG_MIME = "application/x-careflow-event";

type RailTab = "tasks" | "calendar" | "meals" | "habits" | "goals" | "projects" | "zones";
const TABS: { id: RailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  { id: "habits", label: "Habits", icon: Repeat },
  { id: "goals", label: "Goals", icon: Target },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "zones", label: "Zones", icon: Sparkles },
];
const ALL_TAB_IDS: RailTab[] = TABS.map(t => t.id);
const TAB_BY_ID = Object.fromEntries(TABS.map(t => [t.id, t])) as Record<RailTab, typeof TABS[number]>;

const ORDER_KEY = "careflow:rail:tab-order";
const HIDDEN_KEY = "careflow:rail:hidden-tabs";
const RAIL_HIDDEN_KEY = "careflow:rail:collapsed";

function readOrder(): RailTab[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return ALL_TAB_IDS;
    const parsed = JSON.parse(raw) as RailTab[];
    const filtered = parsed.filter(t => ALL_TAB_IDS.includes(t));
    const missing = ALL_TAB_IDS.filter(t => !filtered.includes(t));
    return [...filtered, ...missing];
  } catch { return ALL_TAB_IDS; }
}
function readHidden(): RailTab[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]") as RailTab[]; } catch { return []; }
}

interface RailProps {
  /** Click on a task → open editor for that task. */
  onTaskClick?: (taskId: string) => void;
}

export function UnscheduledTasksRail({ onTaskClick }: RailProps = {}) {
  const store = useStore();
  const { state, toggleHabit, toggleCleaning } = store;
  const [tab, setTab] = useState<RailTab>("tasks");
  const [tabOrder, setTabOrder] = useState<RailTab[]>(() => readOrder());
  const [hiddenTabs, setHiddenTabs] = useState<RailTab[]>(() => readHidden());
  const [railHidden, setRailHidden] = useState<boolean>(() => localStorage.getItem(RAIL_HIDDEN_KEY) === "1");
  useEffect(() => { localStorage.setItem(ORDER_KEY, JSON.stringify(tabOrder)); }, [tabOrder]);
  useEffect(() => { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenTabs)); }, [hiddenTabs]);
  useEffect(() => { localStorage.setItem(RAIL_HIDDEN_KEY, railHidden ? "1" : "0"); }, [railHidden]);

  const visibleTabs = useMemo(
    () => tabOrder.filter(id => !hiddenTabs.includes(id)),
    [tabOrder, hiddenTabs],
  );
  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.includes(tab)) setTab(visibleTabs[0]);
  }, [visibleTabs, tab]);

  const moveTab = (id: RailTab, dir: -1 | 1) => {
    setTabOrder(prev => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const toggleTabHidden = (id: RailTab) => {
    setHiddenTabs(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"unscheduled" | "all">("unscheduled");
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  useEffect(() => {
    if (tab !== "calendar") return;
    gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {});
  }, [tab]);

  const tasks = useMemo(() => {
    const root = state.tasks.filter(t => !t.done && !t.parentTaskId);
    const filtered = scope === "unscheduled" ? root.filter(t => !t.dueDate) : root;
    const term = q.trim().toLowerCase();
    const list = term ? filtered.filter(t => t.title.toLowerCase().includes(term)) : filtered;
    return list.slice(0, 200);
  }, [state.tasks, q, scope]);

  const onDragStart = (e: React.DragEvent, t: Task) => {
    e.dataTransfer.setData(TASK_DRAG_MIME, t.id);
    e.dataTransfer.setData("text/plain", t.title);
    e.dataTransfer.effectAllowed = "move";
  };

  // Calendar tab events
  const today = startOfDay(new Date());
  const horizon = addDays(today, 30);
  const upcomingEvents = useMemo(() => {
    const items: { date: string; time?: string; label: string; kind: "appt" | "bday" | "hol" | "gcal" | "task"; taskId?: string }[] = [];
    for (const a of state.appointments) items.push({ date: a.date, time: a.time, label: a.title, kind: "appt" });
    for (const b of state.birthdays) items.push({ date: b.date, label: `🎂 ${b.name}`, kind: "bday" });
    for (const h of state.holidays) items.push({ date: h.date, label: `✨ ${h.name}`, kind: "hol" });
    for (const g of gEvents) items.push({ date: g.date, time: g.time ?? undefined, label: g.title, kind: "gcal" });
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || !t.dueDate) continue;
      items.push({ date: t.dueDate, label: `○ ${t.title}`, kind: "task", taskId: t.id });
    }
    return items
      .filter(i => {
        try { const d = parseISO(i.date); return !isAfter(today, d) && !isAfter(d, horizon); } catch { return false; }
      })
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  }, [state.appointments, state.birthdays, state.holidays, state.tasks, gEvents, today, horizon]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, typeof upcomingEvents>();
    for (const ev of upcomingEvents) {
      const arr = m.get(ev.date) ?? [];
      arr.push(ev);
      m.set(ev.date, arr);
    }
    return Array.from(m.entries());
  }, [upcomingEvents]);

  const kindClass = (k: string) =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground"
    : "bg-muted text-foreground";

  const onEventDragStart = (e: React.DragEvent, ev: { label: string; kind: string; taskId?: string }) => {
    if (ev.taskId) e.dataTransfer.setData(TASK_DRAG_MIME, ev.taskId);
    const color = ev.kind === "bday" ? "accent" : ev.kind === "hol" ? "secondary" : ev.kind === "task" ? "warm" : "primary";
    e.dataTransfer.setData(EVENT_DRAG_MIME, JSON.stringify({ title: ev.label, color }));
    e.dataTransfer.setData("text/plain", ev.label);
    e.dataTransfer.effectAllowed = "copy";
  };

  if (railHidden) {
    return (
      <button
        type="button"
        onClick={() => setRailHidden(false)}
        className="hidden xl:flex sticky top-20 h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground shadow-soft backdrop-blur-sm hover:text-foreground"
        title="Show side panel"
        aria-label="Show side panel"
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="hidden xl:flex sticky top-20 max-h-[calc(100vh-6rem)] w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-soft">
      <div className="flex items-center gap-0.5 border-b border-border/60 p-1">
        {visibleTabs.map(id => {
          const t = TAB_BY_ID[id];
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              aria-label={t.label}
              className={cn(
                "flex flex-1 items-center justify-center rounded-md px-1 py-1.5 transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
        <RailSettings
          tabOrder={tabOrder}
          hiddenTabs={hiddenTabs}
          onMove={moveTab}
          onToggleHidden={toggleTabHidden}
          onHideRail={() => setRailHidden(true)}
        />
      </div>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
        <select
          value={tab}
          onChange={e => setTab(e.target.value as RailTab)}
          className="flex-1 cursor-pointer rounded bg-transparent text-[11px] font-semibold uppercase tracking-wider text-muted-foreground outline-none hover:text-foreground"
        >
          {visibleTabs.map(id => (
            <option key={id} value={id}>{TAB_BY_ID[id].label}</option>
          ))}
        </select>
      </div>
      {visibleTabs.length === 0 && (
        <div className="m-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
          All panels hidden. Open settings to show one.
        </div>
      )}

      {tab === "tasks" && (
      <>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Inbox className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-none">Unscheduled</div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground">Drag onto any day or time slot</div>
        </div>
      </div>

      <div className="flex gap-1 px-3 pt-2.5">
        {(["unscheduled","all"] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
              scope === s ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "unscheduled" ? "No date" : "All open"}
          </button>
        ))}
      </div>

      <div className="relative px-3 pb-2 pt-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="h-8 pl-7 pr-7 text-xs"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {tasks.length === 0 ? (
          <div className="m-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            Nothing waiting. Capture something with Quick Add.
          </div>
        ) : (
          <ul className="space-y-1">
            {tasks.map(t => {
              const project = t.projectId ? state.projects?.find(p => p.id === t.projectId) : undefined;
              return (
                <TaskRailItem
                  key={t.id}
                  task={t}
                  projectName={project?.name}
                  projectColor={project?.color}
                  onClick={onTaskClick}
                  onDragStart={onDragStart}
                />
              );
            })}
          </ul>
        )}
      </div>
      </>
      )}

      {tab === "calendar" && (
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {eventsByDay.length === 0 ? (
          <div className="m-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No events in the next 30 days.
          </div>
        ) : (
          <ul className="space-y-3">
            {eventsByDay.map(([date, evs]) => (
              <li key={date}>
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(parseISO(date), "EEE, MMM d")}
                </div>
                <ul className="space-y-1">
                  {evs.map((ev, i) => (
                    <li
                      key={i}
                      draggable
                      onDragStart={e => onEventDragStart(e, ev)}
                      className={cn(
                        "group flex cursor-grab items-start gap-2 rounded-lg px-2 py-1.5 text-xs active:cursor-grabbing",
                        kindClass(ev.kind),
                      )}
                      title="Drag onto a time slot to schedule"
                    >
                      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                      {ev.time && <span className="shrink-0 font-mono text-[10px] opacity-70">{ev.time.slice(0,5)}</span>}
                      <span className="min-w-0 flex-1 truncate">{ev.label}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {tab === "meals" && <MealsTab />}
      {tab === "habits" && <HabitsTab onToggle={toggleHabit} />}
      {tab === "goals" && <GoalsTab />}
      {tab === "projects" && <ProjectsTab />}
      {tab === "zones" && <ZonesTab onToggle={toggleCleaning} />}
    </aside>
  );
}

function TaskRailItem({
  task,
  projectName,
  projectColor,
  onClick,
  onDragStart,
}: {
  task: Task;
  projectName?: string;
  projectColor?: string;
  onClick?: (id: string) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
}) {
  const { toggleTask } = useStore();
  const drag = useLongPressDrag(
    () => ({ type: "task", id: task.id, label: task.title }),
    { onClick: () => onClick?.(task.id) },
  );
  return (
    <li
      draggable
      onDragStart={e => onDragStart(e, task)}
      onPointerDown={drag.onPointerDown}
      className={cn(
        "group flex cursor-grab touch-none items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs",
        "hover:border-border/60 hover:bg-muted/40 active:cursor-grabbing",
        onClick && "hover:bg-primary/10",
      )}
      title={onClick ? "Click to edit · long-press to drag" : task.title}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); void toggleTask(task.id); }}
        aria-label={task.done ? "Mark task not done" : "Mark task done"}
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
          task.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary/60",
        )}
      >
        <Check className={cn("h-3 w-3", task.done ? "opacity-100" : "opacity-0")} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-medium leading-snug", task.done && "text-muted-foreground line-through")}>{task.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {projectName && (
            <span className="truncate" style={projectColor ? { color: projectColor } : undefined}>
              {projectName}
            </span>
          )}
          {projectName && task.area && <span>·</span>}
          {task.area && <span className="truncate">{task.area}</span>}
          {task.dueDate && <span className="ml-auto shrink-0">{task.dueDate.slice(5)}</span>}
        </div>
      </div>
    </li>
  );
}

/* ---------- Meals ---------- */
function MealsTab() {
  const { state, updateMeal, deleteMeal } = useStore();
  const today = startOfDay(new Date());
  const horizon = addDays(today, 14);
  const items = useMemo(() => {
    return (state.meals ?? [])
      .filter(m => {
        try { const d = parseISO(m.date); return !isAfter(today, d) && !isAfter(d, horizon); } catch { return false; }
      })
      .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
      .slice(0, 60);
  }, [state.meals, today, horizon]);
  const slots: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const cycleSlot = (m: Meal) => {
    const i = slots.indexOf(m.slot);
    void updateMeal(m.id, { slot: slots[(i + 1) % slots.length] });
  };
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {items.length === 0 ? (
        <EmptyMsg cta="Plan meals" to="/meals">No meals planned in the next 2 weeks.</EmptyMsg>
      ) : (
        <ul className="space-y-1">
          {items.map(m => (
            <RowShell key={m.id} onDelete={() => deleteMeal(m.id)}>
              <InlineEditableTitle
                value={m.name}
                onSave={(v) => updateMeal(m.id, { name: v })}
              />
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>{format(parseISO(m.date), "EEE, MMM d")}</span>
                <span>·</span>
                <button
                  onClick={() => cycleSlot(m)}
                  className="rounded bg-muted/60 px-1.5 py-0.5 font-medium hover:bg-muted"
                  title="Cycle slot"
                >
                  {m.slot}
                </button>
              </div>
            </RowShell>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Habits ---------- */
function HabitsTab({ onToggle }: { onToggle: (id: string, date?: string) => Promise<void> }) {
  const { state, updateHabit, deleteHabit } = useStore() as any;
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const habits = state.habits ?? [];
  const cadences: Habit["cadence"][] = ["daily", "weekly", "monthly"];
  const cycleCadence = (h: Habit) => {
    if (!updateHabit) return;
    const i = cadences.indexOf(h.cadence);
    void updateHabit(h.id, { cadence: cadences[(i + 1) % cadences.length] });
  };
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {habits.length === 0 ? (
        <EmptyMsg cta="Add habits" to="/habits">No habits yet.</EmptyMsg>
      ) : (
        <ul className="space-y-1">
          {habits.map(h => {
            const done = !!h.log?.[todayKey];
            return (
              <RowShell
                key={h.id}
                onDelete={deleteHabit ? () => deleteHabit(h.id) : undefined}
                leading={
                  <button
                    onClick={() => onToggle(h.id)}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                      done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary/60",
                    )}
                    aria-label={done ? "Mark undone" : "Mark done"}
                  >
                    {done && <Check className="h-3 w-3" />}
                  </button>
                }
              >
                <InlineEditableTitle
                  value={h.title}
                  onSave={updateHabit ? (v) => updateHabit(h.id, { title: v }) : undefined}
                />
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
                  <button
                    onClick={() => cycleCadence(h)}
                    className="rounded bg-muted/60 px-1.5 py-0.5 font-medium hover:bg-muted"
                    title="Cycle cadence"
                  >
                    {h.cadence}
                  </button>
                  <span>· streak {h.streak}</span>
                </div>
              </RowShell>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Goals ---------- */
function GoalsTab() {
  const { state, updateGoal, deleteGoal } = useStore();
  const goals = (state.goals ?? []).filter(g => g.status !== "done").slice(0, 80);
  const bumpProgress = (g: Goal, delta: number) => {
    const next = Math.max(0, Math.min(100, g.progress + delta));
    void updateGoal(g.id, { progress: next, status: next >= 100 ? "done" : g.status });
  };
  const cycleStatus = (g: Goal) => {
    const order: Goal["status"][] = ["active", "paused", "done"];
    const i = order.indexOf(g.status);
    void updateGoal(g.id, { status: order[(i + 1) % order.length] });
  };
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {goals.length === 0 ? (
        <EmptyMsg cta="Set goals" to="/goals">No active goals.</EmptyMsg>
      ) : (
        <ul className="space-y-1">
          {goals.map(g => (
            <RowShell key={g.id} onDelete={() => deleteGoal(g.id)}>
              <div className="flex items-baseline justify-between gap-2">
                <InlineEditableTitle
                  value={g.title}
                  onSave={(v) => updateGoal(g.id, { title: v })}
                />
                <span className="shrink-0 text-[10px] text-muted-foreground">{g.progress}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${g.progress}%` }} />
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <button
                  onClick={() => bumpProgress(g, -10)}
                  className="grid h-4 w-4 place-items-center rounded bg-muted/60 hover:bg-muted"
                  title="-10%"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => bumpProgress(g, 10)}
                  className="grid h-4 w-4 place-items-center rounded bg-muted/60 hover:bg-muted"
                  title="+10%"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => cycleStatus(g)}
                  className="ml-1 rounded bg-muted/60 px-1.5 py-0.5 font-medium capitalize hover:bg-muted"
                  title="Cycle status"
                >
                  {g.status}
                </button>
                <span className="ml-auto truncate">{g.category} · {g.timeline}</span>
              </div>
            </RowShell>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Projects ---------- */
function ProjectsTab() {
  const { state, updateProject, deleteProject } = useStore();
  const projects = (state.projects ?? []).filter(p => p.status === "active" || p.status === "paused");
  const cycleStatus = (p: Project) => {
    const next = p.status === "active" ? "paused" : "active";
    void updateProject(p.id, { status: next });
  };
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {projects.length === 0 ? (
        <EmptyMsg cta="Add a project" to="/projects">No active projects.</EmptyMsg>
      ) : (
        <ul className="space-y-1">
          {projects.map(p => (
            <RowShell
              key={p.id}
              onDelete={() => deleteProject(p.id)}
              leading={
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: p.color || "hsl(var(--primary))" }}
                />
              }
              extraActions={
                <button
                  onClick={() => cycleStatus(p)}
                  className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={p.status === "active" ? "Pause" : "Resume"}
                >
                  {p.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
              }
            >
              <div className="flex items-center gap-2">
                <InlineEditableTitle
                  value={p.name}
                  onSave={(v) => updateProject(p.id, { name: v })}
                />
                {p.status === "paused" && <span className="text-[9px] uppercase text-muted-foreground">paused</span>}
              </div>
              {(p.areaName || p.deadline) && (
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  <Link to={`/projects/${p.id}`} className="hover:underline">
                    {p.areaName}{p.areaName && p.deadline ? " · " : ""}{p.deadline} →
                  </Link>
                </div>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Zones (cleaning) ---------- */
function ZonesTab({ onToggle }: { onToggle: (id: string) => Promise<void> }) {
  const { state, updateCleaning, deleteCleaning } = useStore() as any;
  const tasks = state.cleaning ?? [];
  const cadences: CleaningTask["cadence"][] = ["daily", "weekly", "monthly", "seasonal"];
  const cycleCadence = (t: CleaningTask) => {
    if (!updateCleaning) return;
    const i = cadences.indexOf(t.cadence);
    void updateCleaning(t.id, { cadence: cadences[(i + 1) % cadences.length] });
  };
  const zones = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const arr = m.get(t.zone) ?? [];
      arr.push(t);
      m.set(t.zone, arr);
    }
    return Array.from(m.entries());
  }, [tasks]);
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {zones.length === 0 ? (
        <EmptyMsg cta="Open Home Reset" to="/home-reset">No zone tasks yet.</EmptyMsg>
      ) : (
        <ul className="space-y-3">
          {zones.map(([zone, items]) => {
            const left = items.filter(i => !i.done).length;
            return (
              <li key={zone}>
                <Link
                  to="/home-reset"
                  className="flex items-baseline justify-between px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <span>{zone}</span>
                  <span>{left} left</span>
                </Link>
                <ul className="space-y-1">
                  {items.slice(0, 6).map(i => (
                    <RowShell
                      key={i.id}
                      compact
                      onDelete={deleteCleaning ? () => deleteCleaning(i.id) : undefined}
                      leading={
                        <button
                          onClick={() => onToggle(i.id)}
                          className={cn(
                            "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
                            i.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary/60",
                          )}
                          aria-label={i.done ? "Mark undone" : "Mark done"}
                        >
                          {i.done && <Check className="h-2.5 w-2.5" />}
                        </button>
                      }
                      extraActions={
                        <button
                          onClick={() => cycleCadence(i)}
                          className="rounded bg-muted/60 px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Cycle cadence"
                        >
                          {i.cadence}
                        </button>
                      }
                    >
                      <InlineEditableTitle
                        value={i.title}
                        onSave={updateCleaning ? (v) => updateCleaning(i.id, { title: v }) : undefined}
                        className={cn(i.done && "text-muted-foreground line-through")}
                      />
                    </RowShell>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyMsg({ children, cta, to }: { children: React.ReactNode; cta: string; to: string }) {
  return (
    <div className="m-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
      <div>{children}</div>
      <Link to={to} className="mt-2 inline-block text-primary hover:underline">{cta} →</Link>
    </div>
  );
}

function RailSettings({
  tabOrder,
  hiddenTabs,
  onMove,
  onToggleHidden,
  onHideRail,
}: {
  tabOrder: RailTab[];
  hiddenTabs: RailTab[];
  onMove: (id: RailTab, dir: -1 | 1) => void;
  onToggleHidden: (id: RailTab) => void;
  onHideRail: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Panel settings"
          aria-label="Panel settings"
          className="ml-0.5 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="text-xs font-semibold">Side panel</div>
          <button
            onClick={onHideRail}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Hide side panel"
          >
            <PanelRightClose className="h-3 w-3" /> Hide
          </button>
        </div>
        <ul className="space-y-0.5">
          {tabOrder.map((id, i) => {
            const t = TAB_BY_ID[id];
            const Icon = t.icon;
            const visible = !hiddenTabs.includes(id);
            return (
              <li key={id} className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-muted/40">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={cn("flex-1 text-xs", !visible && "text-muted-foreground line-through")}>
                  {t.label}
                </span>
                <button
                  onClick={() => onMove(id, -1)}
                  disabled={i === 0}
                  className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  title="Move up"
                ><ChevronUp className="h-3 w-3" /></button>
                <button
                  onClick={() => onMove(id, 1)}
                  disabled={i === tabOrder.length - 1}
                  className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  title="Move down"
                ><ChevronDown className="h-3 w-3" /></button>
                <button
                  onClick={() => onToggleHidden(id)}
                  className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={visible ? "Hide panel" : "Show panel"}
                >
                  {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Inline edit primitives ---------- */
function InlineEditableTitle({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave?: (v: string) => void | Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => {
    const v = draft.trim();
    setEditing(false);
    if (!v || v === value || !onSave) return;
    void onSave(v);
  };
  if (editing && onSave) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        onClick={e => e.stopPropagation()}
        className={cn(
          "min-w-0 flex-1 truncate rounded border border-primary/40 bg-background/80 px-1 py-0 text-xs font-medium leading-snug outline-none",
          className,
        )}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSave && setEditing(true)}
      title={onSave ? "Click to edit" : undefined}
      className={cn(
        "min-w-0 flex-1 cursor-text truncate text-left text-xs font-medium leading-snug",
        onSave && "hover:text-primary",
        className,
      )}
    >
      {value}
    </button>
  );
}

function RowShell({
  children,
  leading,
  extraActions,
  onDelete,
  compact,
}: {
  children: React.ReactNode;
  leading?: React.ReactNode;
  extraActions?: React.ReactNode;
  onDelete?: () => void | Promise<void>;
  compact?: boolean;
}) {
  return (
    <li className={cn(
      "group flex items-start gap-2 rounded-lg px-2 text-xs hover:bg-muted/40",
      compact ? "py-1" : "py-1.5",
    )}>
      {leading}
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {extraActions}
        {onDelete && (
          <button
            onClick={() => onDelete()}
            className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  );
}