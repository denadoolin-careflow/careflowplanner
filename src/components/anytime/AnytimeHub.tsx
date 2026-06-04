import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers, Sparkles, Clock, Star, Moon, Leaf, Zap, Smile, Heart,
  Home, Briefcase, DollarSign, Brain, Wand2, Coffee, Filter,
  CheckCircle2, ArrowRight, LayoutGrid, LayoutList, Image as ImageIcon, Columns3,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Task, Area } from "@/lib/types";
import { useAtmosphere } from "@/lib/atmospheres";
import { resolveTaskIcon, inferTaskIcon } from "@/lib/task-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { openTaskEditor } from "@/lib/open-task-editor";
import { toast } from "sonner";
import { pickAffirmation } from "@/lib/affirmations";
import { TaskRow } from "@/components/cards/TaskRow";
import { haptics } from "@/lib/haptics";

type Capacity = "bare" | "low" | "normal" | "high";
type View = "cards" | "list" | "gallery" | "kanban";

const CAPACITY: Record<Capacity, { label: string; emoji: string; maxMin: number; allow: Set<string>; tone: string }> = {
  bare:   { label: "Bare Minimum", emoji: "😴", maxMin: 5,   allow: new Set(["low"]),                 tone: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  low:    { label: "Low Energy",   emoji: "🌿", maxMin: 20,  allow: new Set(["low"]),                 tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  normal: { label: "Normal",       emoji: "🙂", maxMin: 60,  allow: new Set(["low","medium"]),        tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  high:   { label: "High Energy",  emoji: "⚡", maxMin: 999, allow: new Set(["low","medium","high"]), tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
};

const AREA_META: Record<string, { icon: any; tint: string }> = {
  Home:                { icon: Home,       tint: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/12" },
  Caregiving:          { icon: Heart,      tint: "text-rose-600 dark:text-rose-300 bg-rose-500/12" },
  "Creative Projects": { icon: Wand2,      tint: "text-fuchsia-600 dark:text-fuchsia-300 bg-fuchsia-500/12" },
  Money:               { icon: DollarSign, tint: "text-amber-700 dark:text-amber-300 bg-amber-500/12" },
  Personal:            { icon: Smile,      tint: "text-sky-600 dark:text-sky-300 bg-sky-500/12" },
  Family:              { icon: Heart,      tint: "text-rose-600 dark:text-rose-300 bg-rose-500/12" },
  Kids:                { icon: Smile,      tint: "text-sky-600 dark:text-sky-300 bg-sky-500/12" },
  Meals:               { icon: Coffee,     tint: "text-orange-600 dark:text-orange-300 bg-orange-500/12" },
  Appointments:        { icon: Briefcase,  tint: "text-violet-600 dark:text-violet-300 bg-violet-500/12" },
  "Holidays & Birthdays": { icon: Sparkles, tint: "text-pink-600 dark:text-pink-300 bg-pink-500/12" },
};
function areaMeta(name: string) { return AREA_META[name] ?? { icon: Layers, tint: "text-foreground/70 bg-muted" }; }

function inferEnergy(t: Task): "low" | "medium" | "high" {
  if (t.energy) return t.energy;
  const est = t.estMinutes ?? 0;
  if (est && est <= 10) return "low";
  if (est && est <= 30) return "medium";
  return t.priority === "high" ? "high" : "medium";
}
function estMin(t: Task): number {
  return t.estMinutes ?? (inferEnergy(t) === "low" ? 5 : inferEnergy(t) === "medium" ? 20 : 45);
}
function isQuickWin(t: Task) { return estMin(t) <= 5; }
function is15Min(t: Task)    { return estMin(t) <= 15; }
function isHighImpact(t: Task) { return t.priority === "high" || t.isTopThree === true; }
function isLowEnergy(t: Task) { return inferEnergy(t) === "low"; }

function matchesCapacity(t: Task, cap: Capacity) {
  const c = CAPACITY[cap];
  if (estMin(t) > c.maxMin) return false;
  return c.allow.has(inferEnergy(t));
}

export function AnytimeHub() {
  const { state, toggleTask } = useStore();
  const atmo = useAtmosphere();
  const [capacity, setCapacity] = useState<Capacity>(() => (localStorage.getItem("careflow:anytime:capacity") as Capacity) || "normal");
  const [view, setView] = useState<View>(() => (localStorage.getItem("careflow:anytime:view") as View) || "cards");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  useEffect(() => { localStorage.setItem("careflow:anytime:capacity", capacity); }, [capacity]);
  useEffect(() => { localStorage.setItem("careflow:anytime:view", view); }, [view]);

  const allAnytime = useMemo(() => state.tasks.filter(t =>
    !t.parentTaskId && !t.done && !t.dueDate && t.status !== "someday" && t.status !== "parked" && !t.inbox
  ), [state.tasks]);

  const stats = useMemo(() => ({
    quickWins: allAnytime.filter(isQuickWin).length,
    fifteen:   allAnytime.filter(is15Min).length,
    highImpact: allAnytime.filter(isHighImpact).length,
    lowEnergy: allAnytime.filter(isLowEnergy).length,
  }), [allAnytime]);

  const filtered = useMemo(() => {
    let list = allAnytime.filter(t => matchesCapacity(t, capacity));
    if (areaFilter) list = list.filter(t => t.area === areaFilter);
    return list;
  }, [allAnytime, capacity, areaFilter]);

  const recommended = useMemo(() => {
    const scored = filtered.map(t => {
      let s = 0;
      if (isQuickWin(t)) s += 3;
      else if (is15Min(t)) s += 2;
      if (isHighImpact(t)) s += 2;
      if (inferEnergy(t) === "low" && (capacity === "bare" || capacity === "low")) s += 2;
      return { t, s };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 3).map(x => x.t);
  }, [filtered, capacity]);

  const areaCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of allAnytime) m.set(t.area, (m.get(t.area) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [allAnytime]);

  const momentum = useMemo(() => {
    const tone = stats.quickWins >= 8 ? "Flowing 🌸" : stats.quickWins >= 4 ? "Gentle 🌿" : "Quiet 🌙";
    return { tone, quick: stats.quickWins, low: stats.lowEnergy, hi: stats.highImpact };
  }, [stats]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      {/* HERO */}
      <header className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Careflow</div>
        <div className="flex items-end gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Anytime</h1>
          <Leaf className="h-7 w-7 text-emerald-500/80" />
        </div>
        <p className="text-sm text-muted-foreground">Things waiting patiently for you. ✨</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard tone="emerald" icon={Leaf} title="Quick Wins" value={stats.quickWins} hint="5 min or less" />
          <StatCard tone="violet"  icon={Clock} title="15-Minute Tasks" value={stats.fifteen} hint="Perfect mid-break" />
          <StatCard tone="amber"   icon={Sparkles} title="High Impact" value={stats.highImpact} hint="Make a big difference" />
          <StatCard tone="plum"    icon={Moon} title="Low Energy" value={stats.lowEnergy} hint="Gentle and doable" />
        </div>
        <MomentumCard momentum={momentum} />
      </div>

      {/* CAPACITY + AREA FILTER */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Panel title="Pick your capacity" icon={Smile}>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CAPACITY) as Capacity[]).map(k => {
              const c = CAPACITY[k];
              const active = capacity === k;
              return (
                <button
                  key={k}
                  onClick={() => setCapacity(k)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm transition-all border",
                    active
                      ? "bg-foreground text-background border-transparent shadow-sm"
                      : "border-border/70 bg-card/60 text-foreground/80 hover:bg-card",
                  )}
                >
                  <span className="mr-1.5">{c.emoji}</span>{c.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> tasks that fit your capacity right now.
          </p>
        </Panel>

        <Panel title="Filter by area" icon={Filter}>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={areaFilter === null} onClick={() => setAreaFilter(null)} label="All areas" />
            {areaCounts.slice(0, 6).map(([a, n]) => (
              <FilterChip
                key={a}
                active={areaFilter === a}
                onClick={() => setAreaFilter(areaFilter === a ? null : a)}
                label={`${a} · ${n}`}
              />
            ))}
          </div>
        </Panel>
      </section>

      {/* WHAT FITS + ATMOSPHERE */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="What fits right now?"
          subtitle={`Based on your capacity, energy, and ${atmo.atmosphere.name}. ✨`}
          icon={Sparkles}
          accent="emerald"
        >
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting — beautifully clear. 🌿</p>
          ) : (
            <ul className="space-y-2">
              {recommended.map(t => <RecommendedRow key={t.id} task={t} onDo={() => doIt(t, toggleTask)} />)}
            </ul>
          )}
          {recommended[0] && (
            <Button
              onClick={() => doIt(recommended[0], toggleTask)}
              variant="secondary"
              className="mt-3 w-full justify-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/25"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Do One Thing
            </Button>
          )}
        </Panel>

        <Panel title="Browse by area" icon={Layers}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {areaCounts.slice(0, 6).map(([a, n]) => {
              const m = areaMeta(a);
              const Icon = m.icon;
              return (
                <button
                  key={a}
                  onClick={() => setAreaFilter(areaFilter === a ? null : a)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3 text-left transition-all hover:bg-card hover:shadow-sm",
                    areaFilter === a && "ring-2 ring-foreground/20",
                  )}
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl", m.tint)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a}</div>
                    <div className="text-[11px] text-muted-foreground">{n} {n === 1 ? "task" : "tasks"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      </section>

      {/* TASK LIST */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">All Anytime Tasks <span className="text-muted-foreground">({filtered.length})</span></h2>
            {areaFilter && <p className="text-xs text-muted-foreground">Filtered to {areaFilter} · <button onClick={() => setAreaFilter(null)} className="underline">clear</button></p>}
          </div>
          <ViewSwitcher value={view} onChange={setView} />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/50 p-10 text-center">
            <Leaf className="mx-auto mb-2 h-6 w-6 text-emerald-500/70" />
            <p className="text-sm text-muted-foreground">Nothing matches this capacity. Try a different one above. 🌿</p>
          </div>
        ) : view === "list" ? (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
            {filtered.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        ) : view === "kanban" ? (
          <CapacityKanban tasks={filtered} />
        ) : view === "gallery" ? (
          <GalleryGrid tasks={filtered} onDo={(t) => doIt(t, toggleTask)} />
        ) : (
          <CardsGrid tasks={filtered} onDo={(t) => doIt(t, toggleTask)} />
        )}
      </section>
    </div>
  );
}

function doIt(t: Task, toggle: (id: string) => Promise<void>) {
  toggle(t.id);
  toast.success(pickAffirmation());
}

/* ---------- pieces ---------- */

const TONE: Record<string, { wrap: string; tile: string; accent: string }> = {
  emerald: { wrap: "from-emerald-500/12 via-emerald-500/5 to-transparent border-emerald-500/20", tile: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", accent: "text-emerald-600 dark:text-emerald-300" },
  violet:  { wrap: "from-violet-500/12 via-violet-500/5 to-transparent border-violet-500/20",   tile: "bg-violet-500/15 text-violet-700 dark:text-violet-300",   accent: "text-violet-600 dark:text-violet-300" },
  amber:   { wrap: "from-amber-500/12 via-amber-500/5 to-transparent border-amber-500/20",      tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300",      accent: "text-amber-700 dark:text-amber-300" },
  plum:    { wrap: "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent border-fuchsia-500/20", tile: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300", accent: "text-fuchsia-600 dark:text-fuchsia-300" },
};

function StatCard({ tone, icon: Icon, title, value, hint }: { tone: keyof typeof TONE; icon: any; title: string; value: number; hint: string }) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4", t.wrap)}>
      <div className="flex items-start gap-3">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", t.tile)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">{title}</div>
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
        </div>
      </div>
    </div>
  );
}

function MomentumCard({ momentum }: { momentum: { tone: string; quick: number; low: number; hi: number } }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Momentum Today</h3>
        <Leaf className="h-4 w-4 text-emerald-500/70" />
      </div>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center justify-between"><span className="font-semibold tabular-nums">{momentum.quick}</span><span className="text-muted-foreground">quick wins available</span></li>
        <li className="flex items-center justify-between"><span className="font-semibold tabular-nums">{momentum.low}</span><span className="text-muted-foreground">low energy tasks</span></li>
        <li className="flex items-center justify-between"><span className="font-semibold tabular-nums">{momentum.hi}</span><span className="text-muted-foreground">high impact tasks</span></li>
      </ul>
      <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Momentum: <span className="font-semibold text-foreground">{momentum.tone}</span>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, accent, children }: { title: string; subtitle?: string; icon?: any; accent?: keyof typeof TONE; children: React.ReactNode }) {
  const t = accent ? TONE[accent] : null;
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/60 p-4", t && `bg-gradient-to-br ${t.wrap}`)}>
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className={cn("h-4 w-4", t?.accent ?? "text-muted-foreground")} />}
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <span className="ml-1 text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-card/60 text-foreground/80 hover:bg-card"
    )}>{label}</button>
  );
}

function RecommendedRow({ task, onDo }: { task: Task; onDo: () => void }) {
  const Icon = inferTaskIcon(task.title, task.notes);
  const m = areaMeta(task.area);
  const min = estMin(task);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/70 p-2.5">
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", m.tint)}>
        <Icon className="h-4 w-4" />
      </span>
      <button onClick={() => openTaskEditor(task.id)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="text-[11px] text-muted-foreground">{task.area} · {inferEnergy(task)} energy</div>
      </button>
      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" /> {min}min
      </span>
      <Button size="sm" onClick={onDo} className="h-8 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white">Do it</Button>
    </li>
  );
}

function ViewSwitcher({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const opts: { k: View; icon: any; label: string }[] = [
    { k: "cards",   icon: LayoutGrid, label: "Cards" },
    { k: "list",    icon: LayoutList, label: "List" },
    { k: "gallery", icon: ImageIcon,  label: "Gallery" },
    { k: "kanban",  icon: Columns3,   label: "Kanban" },
  ];
  return (
    <div className="flex rounded-full border border-border/60 bg-card/60 p-0.5">
      {opts.map(o => {
        const I = o.icon;
        const active = value === o.k;
        return (
          <button
            key={o.k}
            onClick={() => onChange(o.k)}
            title={o.label}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <I className="h-3.5 w-3.5" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CardsGrid({ tasks, onDo }: { tasks: Task[]; onDo: (t: Task) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tasks.slice(0, 60).map(t => <CardTile key={t.id} task={t} onDo={onDo} />)}
    </div>
  );
}

function CardTile({ task, onDo }: { task: Task; onDo: (t: Task) => void }) {
  const Icon = inferTaskIcon(task.title, task.notes);
  const m = areaMeta(task.area);
  const min = estMin(task);
  const energy = inferEnergy(task);
  return (
    <div className="group flex flex-col rounded-2xl border border-border/60 bg-card/70 p-3 transition-all hover:shadow-md hover:bg-card">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", m.tint)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex gap-1">
          {task.priority === "high" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
          {task.priority !== "low" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>
      <button onClick={() => openTaskEditor(task.id)} className="mb-3 text-left">
        <div className="line-clamp-2 text-sm font-semibold leading-snug">{task.title}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{task.area}</div>
      </button>
      <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {min}min</span>
        <span className="inline-flex items-center gap-1 capitalize">
          {energy === "low" ? <Leaf className="h-3 w-3 text-emerald-500" /> : energy === "high" ? <Zap className="h-3 w-3 text-amber-500" /> : <Sparkles className="h-3 w-3 text-violet-500" />}
          {energy} energy
        </span>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onDo(task)} className="mt-2 h-8 justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/20">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Do now
      </Button>
    </div>
  );
}

function GalleryGrid({ tasks, onDo }: { tasks: Task[]; onDo: (t: Task) => void }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {tasks.slice(0, 60).map(t => {
        const Icon = inferTaskIcon(t.title, t.notes);
        const m = areaMeta(t.area);
        return (
          <div key={t.id} className="mb-3 break-inside-avoid rounded-2xl border border-border/60 bg-card/70 p-3">
            <div className={cn("mb-2 grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br", TONE.emerald.wrap)}>
              <Icon className="h-8 w-8 text-foreground/60" />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("grid h-7 w-7 place-items-center rounded-lg", m.tint)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <button onClick={() => openTaskEditor(t.id)} className="block w-full truncate text-left text-sm font-medium">{t.title}</button>
                <div className="text-[10px] text-muted-foreground">{t.area} · {estMin(t)}min</div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onDo(t)} className="mt-2 h-7 w-full justify-center rounded-full text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/20">
              Do now <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Capacity Kanban ---------- */

type CapCol = {
  key: "bare" | "next" | "later" | "done";
  label: string;
  hint: string;
  emoji: string;
  tone: keyof typeof TONE;
  match: (t: Task) => boolean;
  patch: (t: Task) => Partial<Task>;
};

const CAP_COLUMNS: CapCol[] = [
  {
    key: "bare",
    label: "Bare Minimum",
    hint: "≤ 5 min · low energy",
    emoji: "😴",
    tone: "emerald",
    match: (t) => !t.done && estMin(t) <= 5 && inferEnergy(t) === "low",
    patch: () => ({ estMinutes: 5, energy: "low", isTopThree: false, status: "active", done: false }),
  },
  {
    key: "next",
    label: "Do Next",
    hint: "Top picks for right now",
    emoji: "✨",
    tone: "violet",
    match: (t) => !t.done && t.isTopThree === true,
    patch: () => ({ isTopThree: true, status: "active", done: false }),
  },
  {
    key: "later",
    label: "Later",
    hint: "Park gently for another day",
    emoji: "🌙",
    tone: "plum",
    match: (t) => !t.done && t.status === "someday",
    patch: () => ({ status: "someday", isTopThree: false, done: false }),
  },
  {
    key: "done",
    label: "Done",
    hint: "Already complete — nice work",
    emoji: "🌿",
    tone: "amber",
    match: (t) => t.done,
    patch: () => ({ done: true, lastCompletedAt: new Date().toISOString() }),
  },
];

function CapacityKanban({ tasks }: { tasks: Task[] }) {
  const { state, updateTask } = useStore();
  const [hover, setHover] = useState<string | null>(null);

  // Tasks not matched by any specialized column fall into "next" as the default holding lane.
  const cols = useMemo(() => {
    return CAP_COLUMNS.map(c => {
      let items: Task[];
      if (c.key === "next") {
        items = tasks.filter(t =>
          !t.done && t.status !== "someday" && !(estMin(t) <= 5 && inferEnergy(t) === "low") && !t.isTopThree
            ? false
            : c.match(t) ||
              (!t.done && t.status !== "someday" && !(estMin(t) <= 5 && inferEnergy(t) === "low") && !CAP_COLUMNS.some(x => x.key !== "next" && x.match(t)))
        );
      } else {
        items = tasks.filter(c.match);
      }
      return { ...c, items };
    });
  }, [tasks]);

  // Include all anytime tasks (not just filtered) so the board still shows "Done" history.
  const allBoardTasks = state.tasks.filter(t => !t.parentTaskId && !t.dueDate && !t.inbox);

  const onDrop = async (e: React.DragEvent, col: CapCol) => {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData("application/x-careflow-task");
    if (!id) return;
    const t = allBoardTasks.find(x => x.id === id) ?? tasks.find(x => x.id === id);
    if (!t) return;
    haptics.snap?.();
    await updateTask(id, col.patch(t));
    toast.success(`Moved to ${col.label}`);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {cols.map(col => {
        const t = TONE[col.tone];
        const active = hover === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              if (!Array.from(e.dataTransfer.types).includes("application/x-careflow-task")) return;
              e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHover(col.key);
            }}
            onDragLeave={() => setHover(p => p === col.key ? null : p)}
            onDrop={(e) => onDrop(e, col)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-2xl border bg-gradient-to-b p-2 snap-start transition-all",
              t.wrap,
              active && "ring-2 ring-foreground/30 scale-[1.01]",
            )}
          >
            <div className="mb-2 flex items-center justify-between rounded-xl bg-card/70 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-base", t.tile)}>{col.emoji}</span>
                <div>
                  <div className="text-xs font-semibold">{col.label}</div>
                  <div className="text-[10px] text-muted-foreground">{col.hint}</div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{col.items.length}</span>
            </div>
            <div className="flex-1 min-h-32 space-y-1.5">
              {col.items.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-border/50 py-6 text-[11px] text-muted-foreground">
                  Drop a task here
                </div>
              ) : (
                col.items.slice(0, 40).map(task => <CapacityCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CapacityCard({ task }: { task: Task }) {
  const Icon = inferTaskIcon(task.title, task.notes);
  const m = areaMeta(task.area);
  const energy = inferEnergy(task);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-careflow-task", task.id);
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
        haptics.pickup?.();
      }}
      onClick={() => openTaskEditor(task.id)}
      className="group cursor-grab active:cursor-grabbing rounded-xl border border-border/60 bg-card/90 p-2.5 transition hover:shadow-md hover:border-foreground/20"
    >
      <div className="flex items-start gap-2">
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", m.tint)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn("line-clamp-2 text-sm font-medium leading-snug", task.done && "line-through text-muted-foreground")}>{task.title}</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {estMin(task)}min</span>
            <span className="inline-flex items-center gap-0.5 capitalize">
              {energy === "low" ? <Leaf className="h-2.5 w-2.5 text-emerald-500" /> : energy === "high" ? <Zap className="h-2.5 w-2.5 text-amber-500" /> : <Sparkles className="h-2.5 w-2.5 text-violet-500" />}
              {energy}
            </span>
            <span className="truncate">· {task.area}</span>
          </div>
        </div>
      </div>
    </div>
  );
}