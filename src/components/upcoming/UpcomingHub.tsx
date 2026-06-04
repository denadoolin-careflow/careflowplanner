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
  AlertCircle, Compass, Heart, Settings2, Heart as HeartIcon,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/* ---------------- Types & persistence ---------------- */

type ViewMode = "list" | "calendar" | "board" | "grid";
type Timeframe = "all" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "thisMonth";
type EnergyFilter = "all" | Energy;

const VIEW_KEY = "careflow:upcoming:view";
const TF_KEY = "careflow:upcoming:tf";
const EN_KEY = "careflow:upcoming:energy";
const COLLAPSE_KEY = "careflow:upcoming:collapsed";
const SP_KEY = "careflow:upcoming:smartplan";

type EnergyBalance = "gentle" | "balanced" | "ambitious";
type SmartPlanPrefs = {
  energyBalance: EnergyBalance;
  microSteps: number;          // 2–5
  prioritizeCaregiver: boolean;
  perDay: number;              // 1–4 tasks scheduled per day
};
const DEFAULT_SP_PREFS: SmartPlanPrefs = {
  energyBalance: "balanced",
  microSteps: 3,
  prioritizeCaregiver: true,
  perDay: 2,
};
function loadSpPrefs(): SmartPlanPrefs {
  try { return { ...DEFAULT_SP_PREFS, ...JSON.parse(localStorage.getItem(SP_KEY) || "{}") }; }
  catch { return DEFAULT_SP_PREFS; }
}
function isCaregiverTask(t: Task): boolean {
  const a = (t.area || "").toLowerCase();
  if (a.includes("care")) return true;
  return (t.tags ?? []).some(tag => /care|caregiv|loved/i.test(tag));
}

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
  const [spPrefs, setSpPrefs] = useState<SmartPlanPrefs>(() => loadSpPrefs());
  useEffect(() => { localStorage.setItem(SP_KEY, JSON.stringify(spPrefs)); }, [spPrefs]);
  const [planPreview, setPlanPreview] = useState<{ task: Task; iso: string }[] | null>(null);

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

  /* ---------- Smart planning: build proposal, preview, then apply ---------- */
  const buildSmartPlan = (): { task: Task; iso: string }[] => {
    const candidates = state.tasks.filter(
      t => !t.done && !t.parentTaskId && t.status !== "parked" && t.status !== "someday"
        && (!t.dueDate || t.dueDate < today)
    );
    if (candidates.length === 0) return [];
    const baseRank: Record<Energy, number> = { low: 0, medium: 1, high: 2 };
    const balanceWeight: Record<EnergyBalance, Record<Energy, number>> = {
      gentle:    { low: 0, medium: 2, high: 5 },
      balanced:  { low: 0, medium: 1, high: 2 },
      ambitious: { low: 1, medium: 0, high: 0 },
    };
    const w = balanceWeight[spPrefs.energyBalance];
    const sorted = [...candidates].sort((a, b) => {
      if (spPrefs.prioritizeCaregiver) {
        const ca = isCaregiverTask(a) ? -1 : 0;
        const cb = isCaregiverTask(b) ? -1 : 0;
        if (ca !== cb) return ca - cb;
      }
      return (w[inferEnergy(a)] - w[inferEnergy(b)]) || (baseRank[inferEnergy(a)] - baseRank[inferEnergy(b)]);
    });
    const perDay = Math.max(1, Math.min(4, spPrefs.perDay));
    const maxItems = perDay * 7;
    const out: { task: Task; iso: string }[] = [];
    for (let i = 0; i < sorted.length && i < maxItems; i++) {
      const dayOffset = Math.min(6, Math.floor(i / perDay));
      const iso = format(addDays(new Date(), dayOffset), "yyyy-MM-dd");
      out.push({ task: sorted[i], iso });
    }
    return out;
  };

  const smartPlan = () => {
    const plan = buildSmartPlan();
    if (plan.length === 0) { toast("Nothing to plan — you're clear ✨"); return; }
    setPlanPreview(plan);
  };

  const applySmartPlan = async (plan: { task: Task; iso: string }[]) => {
    for (const { task, iso } of plan) {
      await updateTask(task.id, { dueDate: iso, inbox: false });
    }
    toast.success(`Smart-planned ${plan.length} task${plan.length === 1 ? "" : "s"} (${spPrefs.energyBalance}) 🌿`);
    setPlanPreview(null);
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
            prefs={spPrefs}
            onPrefsChange={setSpPrefs}
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
        stepCount={spPrefs.microSteps}
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

function FocusHero({ done, total, energy, pinned, pinnedTitle, accent, onSmartPlan, prefs, onPrefsChange }: { done: number; total: number; energy: Energy; pinned: number; pinnedTitle?: string; accent?: { color: string; soft: string; gradient: string }; onSmartPlan?: () => void; prefs?: SmartPlanPrefs; onPrefsChange?: (p: SmartPlanPrefs) => void }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const tintStyle = accent
    ? { background: `linear-gradient(135deg, ${accent.gradient}, ${accent.soft} 60%, transparent)` }
    : undefined;
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-emerald-50/80 via-amber-50/60 to-rose-50/60 p-5 dark:from-emerald-950/30 dark:via-amber-950/20 dark:to-rose-950/20 sm:p-6"
      style={tintStyle}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl bg-background/70 shadow-sm"
            style={accent ? { color: accent.color } : undefined}
          >
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
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: accent?.color ?? "hsl(var(--primary))" }}
                />
              </div>
            )}
            {onSmartPlan && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={onSmartPlan} size="sm" variant="outline" className="rounded-full bg-background/70">
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Smart-plan my week
                </Button>
                {prefs && onPrefsChange && (
                  <SmartPlanPrefsPopover prefs={prefs} onChange={onPrefsChange} />
                )}
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

function WhatFits({ items, onDoOne, goals, accent, onLinkGoal }: {
  items: Task[];
  onDoOne: () => void;
  goals?: Goal[];
  accent?: { color: string; soft: string; gradient: string };
  onLinkGoal?: (taskId: string, goalId: string) => void;
}) {
  const tintStyle = accent
    ? { background: `linear-gradient(135deg, ${accent.soft}, transparent 70%)` }
    : undefined;
  return (
    <div
      className="rounded-2xl border border-border/50 bg-gradient-to-br from-violet-50/60 via-rose-50/40 to-amber-50/40 p-4 dark:from-violet-950/20 dark:via-rose-950/15 dark:to-amber-950/15"
      style={tintStyle}
    >
      <div className="mb-1">
        <h3 className="font-display text-base">What fits right now?</h3>
        <p className="text-[11px] text-muted-foreground">Based on your energy and time.</p>
      </div>
      <ul className="mt-2 space-y-2">
        {items.length === 0 && <li className="text-xs text-muted-foreground">Nothing matches yet — try adding a small task.</li>}
        {items.map(t => {
          const linkedGoal = goals?.find(g => g.id === t.goalId);
          return (
            <li key={t.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 text-base">{t.icon || "🌿"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t.area} · {estMin(t)} min · <span className="capitalize">{inferEnergy(t)} energy</span>
                  {linkedGoal && <> · 🎯 {linkedGoal.title}</>}
                </div>
              </div>
              {goals && goals.length > 0 && onLinkGoal && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="mt-0.5 rounded-full p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                      title={linkedGoal ? "Linked to goal" : "Link to a goal"}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Connect to a goal
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {goals.map(g => (
                        <button
                          key={g.id}
                          onClick={() => onLinkGoal(t.id, g.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                            g.id === t.goalId && "bg-muted"
                          )}
                        >
                          <Target className="h-3 w-3 text-emerald-600" />
                          <span className="truncate">{g.title}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </li>
          );
        })}
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

function CalendarStrip({ groups, onDropTask, allowDrop }: {
  groups: { label: string; date: string; tasks: Task[] }[];
  onDropTask?: (e: React.DragEvent, iso: string) => void;
  allowDrop?: (e: React.DragEvent) => void;
}) {
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
            <div
              key={iso}
              onDragOver={allowDrop}
              onDrop={(e) => onDropTask?.(e, iso)}
              className={cn(
                "min-h-[110px] rounded-xl border p-2 transition-colors",
                isToday(d) ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border/40 bg-background/40",
                "hover:border-primary/40"
              )}
            >
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

/* ---------- Micro-plan dialog ---------- */

function deriveMicroSteps(task: Task, count = 3): string[] {
  const title = task.title.trim();
  const all = [
    `Take one slow breath, then begin: ${title}`,
    `Set a 2-minute timer to start small`,
    `Do the smallest visible piece (just one bite)`,
    `Pause, breathe, decide: keep going or mark done`,
    `Celebrate the start — momentum matters more than finish`,
  ];
  const n = Math.max(2, Math.min(5, count));
  return all.slice(0, n);
}

function MicroPlanDialog({
  open, onOpenChange, tasks, onComplete, stepCount = 3,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tasks: Task[];
  onComplete: (taskId: string) => void | Promise<void>;
  stepCount?: number;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});
  useEffect(() => { if (open) { setActiveIdx(0); setDoneIds({}); } }, [open]);

  const active = tasks[activeIdx];
  const steps = active ? deriveMicroSteps(active, stepCount) : [];

  const handleComplete = async () => {
    if (!active) return;
    await onComplete(active.id);
    setDoneIds(p => ({ ...p, [active.id]: true }));
    toast.success(`Nice. “${active.title}” complete ✨`);
    if (activeIdx + 1 < tasks.length) setActiveIdx(activeIdx + 1);
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Your tiny micro-plan
          </DialogTitle>
          <DialogDescription>
            Three small steps. You only need to do one to feel momentum.
          </DialogDescription>
        </DialogHeader>

        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recommendations yet — add a small task to get started.
          </p>
        ) : !active ? null : (
          <div className="space-y-4">
            {/* Task chooser pills */}
            <div className="flex flex-wrap gap-1.5">
              {tasks.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    i === activeIdx
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground hover:bg-muted/50",
                    doneIds[t.id] && "line-through opacity-60"
                  )}
                >
                  {i + 1}. {t.title.length > 18 ? t.title.slice(0, 18) + "…" : t.title}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Chosen step
              </div>
              <div className="mt-1 font-display text-lg">{active.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {active.area} · {estMin(active)} min · <span className="capitalize">{inferEnergy(active)} energy</span>
              </div>

              <ol className="mt-3 space-y-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setActiveIdx((activeIdx + 1) % tasks.length)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Skip — show me another
              </button>
              <Button onClick={handleComplete} size="sm" className="rounded-full">
                <Check className="mr-1.5 h-3.5 w-3.5" /> Mark this complete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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

/* ---------- Smart-plan preferences popover ---------- */

function SmartPlanPrefsPopover({ prefs, onChange }: { prefs: SmartPlanPrefs; onChange: (p: SmartPlanPrefs) => void }) {
  const balances: { k: EnergyBalance; label: string; sub: string }[] = [
    { k: "gentle",    label: "Gentle",    sub: "Mostly low-energy wins" },
    { k: "balanced",  label: "Balanced",  sub: "A healthy mix" },
    { k: "ambitious", label: "Ambitious", sub: "Front-load bigger items" },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="rounded-full" title="Smart-plan preferences">
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Preferences
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4 p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Smart planning</div>
          <h4 className="font-display text-base">How should I plan for you?</h4>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Energy balance</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {balances.map(b => {
              const active = prefs.energyBalance === b.k;
              return (
                <button
                  key={b.k}
                  onClick={() => onChange({ ...prefs, energyBalance: b.k })}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-left transition-colors",
                    active ? "border-primary bg-primary/10" : "border-border/50 hover:bg-muted/50"
                  )}
                >
                  <div className="text-xs font-medium">{b.label}</div>
                  <div className="text-[10px] leading-tight text-muted-foreground">{b.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tiny steps per task</Label>
            <span className="text-xs text-muted-foreground">{prefs.microSteps}</span>
          </div>
          <Slider
            min={2}
            max={5}
            step={1}
            value={[prefs.microSteps]}
            onValueChange={(v) => onChange({ ...prefs, microSteps: v[0] })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tasks per day</Label>
            <span className="text-xs text-muted-foreground">{prefs.perDay}</span>
          </div>
          <Slider
            min={1}
            max={4}
            step={1}
            value={[prefs.perDay]}
            onValueChange={(v) => onChange({ ...prefs, perDay: v[0] })}
          />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <HeartIcon className="h-3.5 w-3.5 text-rose-500" /> Prioritize caregiver tasks
            </div>
            <p className="text-[11px] text-muted-foreground">
              Schedule care-related items first when planning.
            </p>
          </div>
          <Switch
            checked={prefs.prioritizeCaregiver}
            onCheckedChange={(v) => onChange({ ...prefs, prioritizeCaregiver: !!v })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}