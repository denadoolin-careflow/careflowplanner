import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isToday, parseISO, startOfWeek } from "date-fns";
import { useStore, todayISO } from "@/lib/store";
import type { Task, Appointment, Energy, Goal } from "@/lib/types";
import { TaskRow } from "@/components/cards/TaskRow";
import { QuickEntryBar } from "@/components/tasks/QuickEntryBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFlowAccent } from "@/lib/flow-accent";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Link2, Wand2, GripVertical } from "lucide-react";
import {
  CalendarRange, LayoutList, CalendarDays, LayoutGrid, Grid3x3,
  Sparkles, Plus, CalendarPlus, ListChecks, Sprout, Zap, Flame,
  Sun, Cloud, Moon, ChevronDown, ChevronUp, ArrowRight, Target,
  AlertCircle, Compass, Heart,
} from "lucide-react";

/* ---------------- Types & persistence ---------------- */

type ViewMode = "list" | "calendar" | "board" | "grid";
type Timeframe = "all" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "thisMonth";
type EnergyFilter = "all" | Energy;

const VIEW_KEY = "careflow:upcoming:view";
const TF_KEY = "careflow:upcoming:tf";
const EN_KEY = "careflow:upcoming:energy";
const COLLAPSE_KEY = "careflow:upcoming:collapsed";

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisWeek", label: "This week" },
  { key: "nextWeek", label: "Next week" },
  { key: "thisMonth", label: "This month" },
];

/* ---------------- Helpers ---------------- */

function upcomingTasks(all: Task[]) {
  const today = todayISO();
  return all.filter(t => !t.parentTaskId && !t.done && t.dueDate && t.status !== "parked");
}
function inTimeframe(t: Task, tf: Timeframe): boolean {
  if (!t.dueDate) return false;
  const today = todayISO();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const wkStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const wkEnd = format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const nwStart = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1), "yyyy-MM-dd");
  const nwEnd = format(addWeeks(endOfWeek(new Date(), { weekStartsOn: 0 }), 1), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const d = t.dueDate;
  switch (tf) {
    case "all": return true;
    case "today": return d === today;
    case "tomorrow": return d === tomorrow;
    case "thisWeek": return d >= wkStart && d <= wkEnd;
    case "nextWeek": return d >= nwStart && d <= nwEnd;
    case "thisMonth": return d >= today && d <= monthEnd;
  }
}
function estMin(t: Task) { return t.estMinutes ?? 15; }
function inferEnergy(t: Task): Energy {
  if (t.energy) return t.energy;
  const m = estMin(t);
  if (m <= 10) return "low";
  if (m <= 30) return "medium";
  return "high";
}

function dayBucket(t: Task): { key: string; label: string; icon: any; order: number } {
  const today = todayISO();
  const d = t.dueDate || today;
  const date = parseISO(d);
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const wkEnd = format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const nwEnd = format(addWeeks(endOfWeek(new Date(), { weekStartsOn: 0 }), 1), "yyyy-MM-dd");
  if (d < today) return { key: "overdue", label: "Overdue", icon: AlertCircle, order: -1 };
  if (d === today) return { key: "today", label: "Today", icon: Sun, order: 0 };
  if (d === tomorrow) return { key: "tomorrow", label: "Tomorrow", icon: Cloud, order: 1 };
  if (d <= wkEnd) return { key: "thisWeek", label: "This week", icon: CalendarDays, order: 2 };
  if (d <= nwEnd) return { key: "nextWeek", label: "Next week", icon: Moon, order: 3 };
  return { key: format(date, "yyyy-MM"), label: format(date, "MMMM"), icon: CalendarRange, order: 4 };
}

/* ---------------- Hub ---------------- */

export function UpcomingHub() {
  const { state, addTask, updateTask, toggleTask } = useStore();
  const navigate = useNavigate();
  const accent = useFlowAccent("planflow");
  const [microOpen, setMicroOpen] = useState(false);

  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(VIEW_KEY) as ViewMode) || "list");
  const [tf, setTf] = useState<Timeframe>(() => (localStorage.getItem(TF_KEY) as Timeframe) || "all");
  const [energy, setEnergy] = useState<EnergyFilter>(() => (localStorage.getItem(EN_KEY) as EnergyFilter) || "all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(TF_KEY, tf); }, [tf]);
  useEffect(() => { localStorage.setItem(EN_KEY, energy); }, [energy]);
  useEffect(() => { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed)); }, [collapsed]);

  const today = todayISO();
  const base = useMemo(() => upcomingTasks(state.tasks), [state.tasks]);

  // Counts across the full base (independent of pill selection)
  const counts = useMemo(() => {
    const c: Record<Timeframe, number> = { all: 0, today: 0, tomorrow: 0, thisWeek: 0, nextWeek: 0, thisMonth: 0 };
    for (const t of base) for (const k of Object.keys(c) as Timeframe[]) if (inTimeframe(t, k)) c[k]++;
    return c;
  }, [base]);

  const overdueCount = useMemo(
    () => state.tasks.filter(t => !t.done && t.dueDate && t.dueDate < today && !t.parentTaskId).length,
    [state.tasks, today]
  );
  const unscheduledCount = useMemo(
    () => state.tasks.filter(t => !t.done && !t.dueDate && t.status !== "someday" && !t.parentTaskId).length,
    [state.tasks]
  );

  const filtered = useMemo(() => {
    return base
      .filter(t => inTimeframe(t, tf))
      .filter(t => energy === "all" ? true : inferEnergy(t) === energy)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }, [base, tf, energy]);

  // Today's focus stats
  const todayTasks = state.tasks.filter(t => !t.parentTaskId && t.dueDate === today);
  const todayDone = todayTasks.filter(t => t.done).length;
  const pinnedFocus = todayTasks.filter(t => t.isTopThree);
  const dominantEnergy: Energy = (() => {
    const counts = { low: 0, medium: 0, high: 0 } as Record<Energy, number>;
    todayTasks.forEach(t => counts[inferEnergy(t)]++);
    return (Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] as Energy) ?? "low";
  })();

  // Energy buckets across upcoming
  const energyCounts = { low: 0, medium: 0, high: 0 } as Record<Energy, number>;
  base.forEach(t => energyCounts[inferEnergy(t)]++);

  // What fits right now (3 recs based on energy + short duration + soonest)
  const recommendations = useMemo(() => {
    const score = (t: Task) => {
      const e = inferEnergy(t);
      const energyMatch = e === dominantEnergy ? 0 : e === "low" ? 1 : 2;
      const overdue = (t.dueDate ?? "") < today ? -3 : 0;
      const soon = Math.max(0, Math.min(5, ((parseISO(t.dueDate ?? today).getTime() - Date.now()) / 86400000)));
      return energyMatch + soon + overdue + estMin(t) / 30;
    };
    return [...base].sort((a, b) => score(a) - score(b)).slice(0, 3);
  }, [base, dominantEnergy, today]);

  // Coming up next: appointments
  const upcomingAppts = useMemo(
    () => (state.appointments ?? [])
      .filter(a => a.date >= today)
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
      .slice(0, 5),
    [state.appointments, today]
  );

  // Grouped by day
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; icon: any; order: number; date: string; tasks: Task[] }>();
    for (const t of filtered) {
      const b = dayBucket(t);
      const k = b.order >= 4 ? `m-${b.key}` : (b.order === 2 || b.order === 3 ? b.key : (t.dueDate ?? today));
      const existing = map.get(k);
      if (existing) existing.tasks.push(t);
      else map.set(k, { label: b.label === b.label ? formatGroupLabel(b, t) : b.label, icon: b.icon, order: b.order, date: t.dueDate ?? today, tasks: [t] });
    }
    return [...map.values()].sort((a, b) => a.order - b.order || a.date.localeCompare(b.date));
  }, [filtered, today]);

  const toggleCollapsed = (k: string) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  /* ---------- Drag to reschedule (HTML5 DnD) ---------- */
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/careflow-task", taskId);
    e.dataTransfer.effectAllowed = "move";
  };
  const rescheduleDrop = async (e: React.DragEvent, iso: string) => {
    const id = e.dataTransfer.getData("text/careflow-task");
    if (!id) return;
    e.preventDefault();
    await updateTask(id, { dueDate: iso, inbox: false });
    toast.success(`Moved to ${format(parseISO(iso), "EEE MMM d")}`);
  };
  const allowDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("text/careflow-task")) e.preventDefault();
  };

  /* ---------- Smart planning: spread overdue + unscheduled by energy ---------- */
  const smartPlan = async () => {
    const candidates = state.tasks.filter(
      t => !t.done && !t.parentTaskId && t.status !== "parked" && t.status !== "someday"
        && (!t.dueDate || t.dueDate < today)
    );
    if (candidates.length === 0) { toast("Nothing to plan — you're clear ✨"); return; }
    // sort by energy: low first (easy wins), then medium, then high
    const rank: Record<Energy, number> = { low: 0, medium: 1, high: 2 };
    const sorted = [...candidates].sort((a, b) => rank[inferEnergy(a)] - rank[inferEnergy(b)]);
    let scheduled = 0;
    for (let i = 0; i < sorted.length && i < 14; i++) {
      const dayOffset = Math.min(6, Math.floor(i / 2)); // 2 per day across 7 days
      const iso = format(addDays(new Date(), dayOffset), "yyyy-MM-dd");
      await updateTask(sorted[i].id, { dueDate: iso, inbox: false });
      scheduled++;
    }
    toast.success(`Smart-planned ${scheduled} task${scheduled === 1 ? "" : "s"} across the week 🌿`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> CareFlow
          </div>
          <h1 className="font-display mt-1 flex items-center gap-2 text-3xl sm:text-4xl">
            🌿 Upcoming
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Scheduled for the days ahead. ✨</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip label="Total" value={base.length} tint="sage" />
            <StatChip label="This week" value={counts.thisWeek} tint="plum" />
            <StatChip label="Overdue" value={overdueCount} tint="blush" />
            <StatChip label="Unscheduled" value={unscheduledCount} tint="gold" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/week")} variant="default" size="sm" className="rounded-full">
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Plan Week
          </Button>
          <Button onClick={() => document.getElementById("upcoming-quickadd")?.scrollIntoView({ behavior: "smooth" })} variant="outline" size="sm" className="rounded-full">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Task
          </Button>
          <Button onClick={() => navigate("/calendar")} variant="outline" size="sm" className="rounded-full">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Calendar
          </Button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle value={view} onChange={setView} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {energy !== "all" && (
            <button onClick={() => setEnergy("all")} className="rounded-full bg-muted/60 px-2.5 py-1 hover:bg-muted">
              Energy: {energy} ✕
            </button>
          )}
        </div>
      </div>

      {/* TIME FILTERS */}
      <div className="flex flex-wrap gap-1.5">
        {TIMEFRAMES.map(t => (
          <button
            key={t.key}
            onClick={() => setTf(t.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
              tf === t.key
                ? "border-emerald-400/50 bg-emerald-100/70 text-emerald-900 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-border/50 bg-card/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label} <span className="ml-1 opacity-60">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN COLUMN */}
        <div className="space-y-5 lg:col-span-2">
          {/* TODAY'S FOCUS HERO */}
          <FocusHero
            done={todayDone}
            total={todayTasks.length}
            energy={dominantEnergy}
            pinned={pinnedFocus.length}
            pinnedTitle={pinnedFocus[0]?.title}
            accent={accent}
            onSmartPlan={smartPlan}
          />

          {/* QUICK ADD */}
          <div id="upcoming-quickadd">
            <QuickEntryBar
              defaults={{ dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd") }}
              placeholder="Add to upcoming — try natural language…"
            />
          </div>

          {/* CONTENT BY VIEW */}
          {filtered.length === 0 ? (
            <EmptyBreathingRoom onPlan={() => navigate("/week")} onAnytime={() => navigate("/anytime")} onGoals={() => navigate("/goals")} />
          ) : view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map(t => (
                <div key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)} className="cursor-grab active:cursor-grabbing">
                  <TaskRow task={t} />
                </div>
              ))}
            </div>
          ) : view === "board" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {groups.map(g => (
                <div
                  key={g.label + g.date}
                  onDragOver={allowDrop}
                  onDrop={(e) => rescheduleDrop(e, g.date)}
                  className="rounded-2xl border border-border/50 bg-card/50 p-3 transition-colors"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <g.icon className="h-3.5 w-3.5" /> {g.label}
                    <span className="ml-auto">{g.tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {g.tasks.map(t => (
                      <div key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)} className="cursor-grab active:cursor-grabbing">
                        <TaskRow task={t} dense />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : view === "calendar" ? (
            <CalendarStrip groups={groups} onDropTask={rescheduleDrop} allowDrop={allowDrop} />
          ) : (
            <div className="space-y-3">
              {groups.map(g => {
                const isC = !!collapsed[g.label + g.date];
                return (
                  <section
                    key={g.label + g.date}
                    onDragOver={allowDrop}
                    onDrop={(e) => rescheduleDrop(e, g.date)}
                    className="rounded-2xl border border-border/50 bg-card/60 p-2 transition-colors"
                  >
                    <button
                      onClick={() => toggleCollapsed(g.label + g.date)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-muted/40"
                    >
                      <g.icon className={cn("h-4 w-4", g.order === -1 ? "text-rose-500" : "text-emerald-600")} />
                      <span className="font-display text-base">{g.label}</span>
                      <span className="text-xs text-muted-foreground">· {g.tasks.length} {g.tasks.length === 1 ? "item" : "items"}</span>
                      <span className="ml-auto text-muted-foreground">
                        {isC ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </span>
                    </button>
                    {!isC && (
                      <div className="mt-1 space-y-1">
                        {g.tasks.map(t => (
                          <div key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)} className="group flex items-start gap-1 cursor-grab active:cursor-grabbing">
                            <GripVertical className="mt-3 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                            <div className="min-w-0 flex-1"><TaskRow task={t} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* SIDEBAR — desktop column, mobile swipeable */}
        <aside className="hidden lg:block lg:space-y-4">
          <OverviewCard total={base.length} week={counts.thisWeek} overdue={overdueCount} unsched={unscheduledCount} onPlan={() => navigate("/week")} />
          <EnergyGuide counts={energyCounts} active={energy} onSelect={setEnergy} />
          <WhatFits
            items={recommendations}
            goals={state.goals ?? []}
            accent={accent}
            onDoOne={() => setMicroOpen(true)}
            onLinkGoal={(taskId, goalId) => updateTask(taskId, { goalId })}
          />
          <ComingUpNext items={upcomingAppts} onAll={() => navigate("/calendar")} />
        </aside>
      </div>

      {/* MOBILE swipeable widgets */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:hidden">
        <div className="min-w-[85%] snap-start"><OverviewCard total={base.length} week={counts.thisWeek} overdue={overdueCount} unsched={unscheduledCount} onPlan={() => navigate("/week")} /></div>
        <div className="min-w-[85%] snap-start"><EnergyGuide counts={energyCounts} active={energy} onSelect={setEnergy} /></div>
        <div className="min-w-[85%] snap-start">
          <WhatFits
            items={recommendations}
            goals={state.goals ?? []}
            accent={accent}
            onDoOne={() => setMicroOpen(true)}
            onLinkGoal={(taskId, goalId) => updateTask(taskId, { goalId })}
          />
        </div>
        <div className="min-w-[85%] snap-start"><ComingUpNext items={upcomingAppts} onAll={() => navigate("/calendar")} /></div>
      </div>

      <MicroPlanDialog
        open={microOpen}
        onOpenChange={setMicroOpen}
        tasks={recommendations}
        onComplete={async (id) => { await toggleTask(id); }}
      />
    </div>
  );
}

function formatGroupLabel(b: { order: number; label: string }, t: Task) {
  if (b.order === 0 || b.order === 1 || b.order === -1) return b.label;
  if (!t.dueDate) return b.label;
  return `${b.label} · ${format(parseISO(t.dueDate), "EEE MMM d")}`;
}

/* ---------------- Subcomponents ---------------- */

function StatChip({ label, value, tint }: { label: string; value: number; tint: "sage" | "plum" | "blush" | "gold" }) {
  const tints: Record<string, string> = {
    sage: "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-200/60",
    plum: "bg-violet-100/70 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 border-violet-200/60",
    blush: "bg-rose-100/70 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border-rose-200/60",
    gold: "bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200/60",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", tints[tint])}>
      <span className="font-semibold">{value}</span> <span className="opacity-80">{label}</span>
    </span>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { key: ViewMode; icon: any; label: string }[] = [
    { key: "list", icon: LayoutList, label: "List" },
    { key: "calendar", icon: CalendarDays, label: "Calendar" },
    { key: "board", icon: LayoutGrid, label: "Board" },
    { key: "grid", icon: Grid3x3, label: "Grid" },
  ];
  return (
    <div className="flex rounded-full border border-border/50 bg-card/60 p-0.5">
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          title={o.label}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors",
            value === o.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function FocusHero({ done, total, energy, pinned, pinnedTitle }: { done: number; total: number; energy: Energy; pinned: number; pinnedTitle?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-emerald-50/80 via-amber-50/60 to-rose-50/60 p-5 dark:from-emerald-950/30 dark:via-amber-950/20 dark:to-rose-950/20 sm:p-6">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-background/70 text-emerald-700 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-2xl text-foreground/90">✨ Today's Focus</h2>
            <p className="text-sm italic text-muted-foreground">A gentle anchor for the day.</p>
            <div className="mt-4 grid grid-cols-3 gap-5">
              <FocusStat label="Progress" value={total ? `${done}/${total}` : "0/0"} sub={`${pct}%`} />
              <FocusStat label="Energy" value={<span className="capitalize">{energy}</span>} />
              <FocusStat label="Focus" value={pinned ? `${pinned} pinned` : "0 pinned"} sub={pinnedTitle} />
            </div>
            {total > 0 && (
              <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-background/50">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        </div>
        <div className="hidden text-6xl opacity-70 sm:block">🪴</div>
      </div>
    </section>
  );
}

function FocusStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="font-display text-lg leading-tight text-foreground/90">{value}</div>
      {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function OverviewCard({ total, week, overdue, unsched, onPlan }: { total: number; week: number; overdue: number; unsched: number; onPlan: () => void }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Compass className="h-4 w-4 text-emerald-600" />
        <h3 className="font-display text-base">Upcoming Overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Total items" value={total} />
        <Tile label="This week" value={week} />
        <Tile label="Overdue" value={overdue} tone={overdue ? "rose" : undefined} />
        <Tile label="No time set" value={unsched} tone="amber" />
      </div>
      <Button onClick={onPlan} className="mt-3 w-full rounded-xl" size="sm">
        <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Plan your week
      </Button>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "rose" | "amber" }) {
  const t = tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
      <div className={cn("font-display text-2xl leading-none", t)}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EnergyGuide({ counts, active, onSelect }: { counts: Record<Energy, number>; active: EnergyFilter; onSelect: (e: EnergyFilter) => void }) {
  const rows: { k: Energy; label: string; icon: any; tint: string; iconC: string }[] = [
    { k: "low",    label: "Low Energy",    icon: Sprout, tint: "bg-emerald-100/60 dark:bg-emerald-950/40", iconC: "text-emerald-600" },
    { k: "medium", label: "Medium Energy", icon: Zap,    tint: "bg-amber-100/60 dark:bg-amber-950/40",     iconC: "text-amber-600" },
    { k: "high",   label: "High Energy",   icon: Flame,  tint: "bg-rose-100/60 dark:bg-rose-950/40",       iconC: "text-rose-600" },
  ];
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base">Energy Guide</h3>
        {active !== "all" && (
          <button onClick={() => onSelect("all")} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
        )}
      </div>
      <div className="space-y-1.5">
        {rows.map(r => {
          const isActive = active === r.k;
          return (
            <button
              key={r.k}
              onClick={() => onSelect(isActive ? "all" : r.k)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                isActive ? "bg-muted/70" : "hover:bg-muted/40"
              )}
            >
              <span className={cn("grid h-7 w-7 place-items-center rounded-lg", r.tint, r.iconC)}>
                <r.icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 text-sm">{r.label}</span>
              <span className="text-xs text-muted-foreground">{counts[r.k]} items</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WhatFits({ items, onDoOne }: { items: Task[]; onDoOne: () => void }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-violet-50/60 via-rose-50/40 to-amber-50/40 p-4 dark:from-violet-950/20 dark:via-rose-950/15 dark:to-amber-950/15">
      <div className="mb-1">
        <h3 className="font-display text-base">What fits right now?</h3>
        <p className="text-[11px] text-muted-foreground">Based on your energy and time.</p>
      </div>
      <ul className="mt-2 space-y-2">
        {items.length === 0 && <li className="text-xs text-muted-foreground">Nothing matches yet — try adding a small task.</li>}
        {items.map(t => (
          <li key={t.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-base">{t.icon || "🌿"}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {t.area} · {estMin(t)} min · <span className="capitalize">{inferEnergy(t)} energy</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <Button onClick={onDoOne} size="sm" className="mt-3 w-full rounded-xl">
          <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Do One Thing
        </Button>
      )}
    </div>
  );
}

function ComingUpNext({ items, onAll }: { items: Appointment[]; onAll: () => void }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-base">Coming Up Next</h3>
        <button onClick={onAll} className="text-[11px] text-primary hover:underline">View calendar</button>
      </div>
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-xs text-muted-foreground">No upcoming events.</li>}
        {items.map(a => {
          const d = parseISO(a.date);
          return (
            <li key={a.id} className="flex items-start gap-3">
              <div className="grid w-9 shrink-0 place-items-center rounded-lg bg-muted/50 py-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "MMM")}</div>
                <div className="font-display text-lg leading-none">{format(d, "d")}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {format(d, "EEE")}{a.time ? ` · ${a.time}` : ""}{a.areaName ? ` · ${a.areaName}` : ""}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CalendarStrip({ groups }: { groups: { label: string; date: string; tasks: Task[] }[] }) {
  // 14-day strip
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  const tasksByDate = new Map<string, Task[]>();
  groups.forEach(g => g.tasks.forEach(t => {
    const d = t.dueDate || "";
    if (!tasksByDate.has(d)) tasksByDate.set(d, []);
    tasksByDate.get(d)!.push(t);
  }));
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
      <div className="grid grid-cols-7 gap-2">
        {days.map(d => {
          const iso = format(d, "yyyy-MM-dd");
          const list = tasksByDate.get(iso) || [];
          return (
            <div key={iso} className={cn(
              "min-h-[110px] rounded-xl border p-2",
              isToday(d) ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border/40 bg-background/40"
            )}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
                <span className={cn("font-display text-base", isToday(d) && "text-emerald-700")}>{format(d, "d")}</span>
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map(t => (
                  <div key={t.id} className="truncate rounded bg-background/70 px-1.5 py-0.5 text-[11px]">
                    {t.icon ? `${t.icon} ` : ""}{t.title}
                  </div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-muted-foreground">+{list.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyBreathingRoom({ onPlan, onAnytime, onGoals }: { onPlan: () => void; onAnytime: () => void; onGoals: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-gradient-to-br from-emerald-50/40 via-amber-50/30 to-rose-50/30 p-10 text-center dark:from-emerald-950/20 dark:via-amber-950/10 dark:to-rose-950/10">
      <div className="text-4xl">✨</div>
      <h3 className="mt-3 font-display text-xl">You have breathing room.</h3>
      <p className="mt-1 text-sm text-muted-foreground">Nothing scheduled. What would feel kind right now?</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={onPlan} className="rounded-full"><CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Plan Your Week</Button>
        <Button onClick={onAnytime} variant="outline" className="rounded-full"><ListChecks className="mr-1.5 h-3.5 w-3.5" /> Pull from Anytime</Button>
        <Button onClick={onGoals} variant="outline" className="rounded-full"><Target className="mr-1.5 h-3.5 w-3.5" /> Review Goals</Button>
      </div>
    </div>
  );
}