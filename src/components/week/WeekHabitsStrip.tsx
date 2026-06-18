import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { fireConfetti } from "@/lib/confetti";
import { HabitDetailSheet } from "@/components/habits/HabitDetailSheet";
import {
  Sprout, Flame, Trophy, CheckCircle2, Sun, CloudSun, Moon, GripVertical, Plus, Sparkles,
} from "lucide-react";
import type { Habit } from "@/lib/types";
import { Link } from "react-router-dom";

type Slot = "all" | "morning" | "afternoon" | "evening";

const SLOTS: { id: Exclude<Slot, "all">; label: string; Icon: React.ComponentType<{ className?: string }>; chip: string }[] = [
  { id: "morning",   label: "Morning",   Icon: Sun,      chip: "text-amber-600 dark:text-amber-300" },
  { id: "afternoon", label: "Day",       Icon: CloudSun, chip: "text-sky-600 dark:text-sky-300" },
  { id: "evening",   label: "Evening",   Icon: Moon,     chip: "text-indigo-500 dark:text-indigo-300" },
];

function primarySlot(h: Habit): Exclude<Slot, "all"> {
  const t = h.timesOfDay?.[0];
  if (t === "morning") return "morning";
  if (t === "evening") return "evening";
  return "afternoon"; // midday / afternoon / anytime → "Day"
}

export function WeekHabitsStrip({ weekStart: weekStartProp }: { weekStart: Date }) {
  const { state, toggleHabit, updateHabit } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Slot>("all");
  const [weekStart, setWeekStart] = useState(weekStartProp);
  useEffect(() => setWeekStart(weekStartProp), [weekStartProp]);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const stats = useMemo(() => {
    const total = state.habits.length * 7;
    let done = 0;
    let todayDone = 0;
    for (const h of state.habits) {
      for (const d of days) {
        if (h.log[format(d, "yyyy-MM-dd")]) done++;
      }
      if (h.log[todayKey]) todayDone++;
    }
    // last-week ratio for delta
    let lastDone = 0;
    const lastStart = subDays(weekStart, 7);
    for (const h of state.habits) {
      for (let i = 0; i < 7; i++) if (h.log[format(addDays(lastStart, i), "yyyy-MM-dd")]) lastDone++;
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    const lastPct = total ? Math.round((lastDone / total) * 100) : 0;
    // current + longest streak across all habits (forgiving — counts a day if any habit done)
    const wasDay = (k: string) => state.habits.some(h => h.log[k]);
    let current = 0;
    for (let i = 0; i < 400; i++) {
      const k = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (wasDay(k)) current++; else break;
    }
    let longest = 0, run = 0;
    for (let i = 0; i < 400; i++) {
      const k = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (wasDay(k)) { run++; longest = Math.max(longest, run); } else run = 0;
    }
    return { total, done, todayDone, pct, deltaPct: pct - lastPct, current, longest };
  }, [state.habits, days, todayKey, weekStart]);

  // Celebrate progress: confetti when weekly pct hits 100% or today reaches all-done
  const celebratedKey = useRef<string>("");
  useEffect(() => {
    const key = `${format(weekStart, "yyyy-MM-dd")}:${stats.pct}:${stats.todayDone}/${state.habits.length}`;
    if (celebratedKey.current === key) return;
    celebratedKey.current = key;
    if (state.habits.length && (stats.pct === 100 || stats.todayDone === state.habits.length)) {
      fireConfetti({ count: 80 });
      haptics.success?.();
    }
  }, [stats.pct, stats.todayDone, state.habits.length, weekStart]);

  if (!state.habits.length) return null;

  const filtered = state.habits.filter(h => tab === "all" ? true : primarySlot(h) === tab);

  const completeToday = async (h: Habit) => {
    const wasDone = !!h.log[todayKey];
    await toggleHabit(h.id, todayKey);
    if (!wasDone) {
      setCelebrating(h.id);
      haptics.success?.();
      fireConfetti({ count: 28 });
      setTimeout(() => setCelebrating(c => (c === h.id ? null : c)), 900);
    } else {
      haptics.tap?.();
    }
  };

  return (
    <>
      <section className="cozy-card p-4 sm:p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
              <Sprout className="h-4 w-4 text-primary" /> Habits
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Small daily actions, big life change.</p>
          </div>
          <Link to="/habits" className="rounded-xl border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-medium hover:bg-card">
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Add habit
          </Link>
        </header>

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Weekly progress">
            <div className="flex items-center gap-3">
              <ProgressRing pct={stats.pct} />
              <div>
                <div className="font-display text-xl font-semibold tabular-nums">{stats.done} <span className="text-muted-foreground">/ {stats.total}</span></div>
                <div className="text-[11px] text-muted-foreground">habits completed</div>
                {stats.total > 0 && (
                  <div className={cn("mt-0.5 text-[11px]", stats.deltaPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {stats.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(stats.deltaPct)}% from last week
                  </div>
                )}
              </div>
            </div>
          </KpiCard>
          <KpiCard title="Current streak">
            <div className="flex items-center gap-3">
              <Flame className="h-7 w-7 text-amber-500" />
              <div>
                <div className="font-display text-2xl font-semibold tabular-nums">{stats.current} <span className="text-sm font-normal text-muted-foreground">days</span></div>
                <div className="mt-0.5 inline-flex rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">Best: {stats.longest} days</div>
              </div>
            </div>
          </KpiCard>
          <KpiCard title="Longest streak">
            <div className="flex items-center gap-3">
              <Trophy className="h-7 w-7 text-amber-500" />
              <div>
                <div className="font-display text-2xl font-semibold tabular-nums">{stats.longest} <span className="text-sm font-normal text-muted-foreground">days</span></div>
                <div className="mt-0.5 text-[11px] text-primary">Keep it going!</div>
              </div>
            </div>
          </KpiCard>
          <KpiCard title="Habits completed today">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-primary" />
              <div className="flex-1">
                <div className="font-display text-2xl font-semibold tabular-nums">{stats.todayDone} / {state.habits.length}</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${state.habits.length ? (stats.todayDone / state.habits.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </KpiCard>
        </div>

        {/* List */}
        <div className="mt-4">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto">
              <TabPill active={tab === "all"} onClick={() => setTab("all")}>All habits</TabPill>
              {SLOTS.map(s => (
                <SlotTab
                  key={s.id}
                  active={tab === s.id}
                  label={s.label}
                  Icon={s.Icon}
                  chip={s.chip}
                  onClick={() => setTab(s.id)}
                  onDropHabit={(habitId) => {
                    updateHabit(habitId, { timesOfDay: [s.id === "afternoon" ? "afternoon" : s.id] as Habit["timesOfDay"] });
                    haptics.tap?.();
                  }}
                />
              ))}
            </div>

            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border/40 px-2 pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>Habit</span><span>Streak</span><span className="pr-1">Today</span>
            </div>
            <ul className="divide-y divide-border/40">
              {filtered.length === 0 && (
                <li className="py-6 text-center text-xs text-muted-foreground">No habits in this slot — drag one here to schedule it.</li>
              )}
              {filtered.map(h => {
                const slot = primarySlot(h);
                const slotMeta = SLOTS.find(s => s.id === slot)!;
                const done = !!h.log[todayKey];
                const isCelebrating = celebrating === h.id;
                return (
                  <li
                    key={h.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/habit-id", h.id); e.dataTransfer.effectAllowed = "move"; }}
                    className={cn(
                      "group relative grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                      done && "bg-primary/5",
                      isCelebrating && "animate-scale-in",
                    )}
                  >
                    {isCelebrating && (
                      <>
                        <span className="pointer-events-none absolute inset-0 rounded-lg bg-primary/10 animate-fade-in" />
                        <Sparkles className="pointer-events-none absolute right-2 top-1.5 h-4 w-4 text-amber-400 animate-scale-in" />
                      </>
                    )}
                    <div className="flex min-w-0 items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/60 opacity-0 group-hover:opacity-100" />
                      <button
                        onClick={() => completeToday(h)}
                        aria-label="Toggle today"
                        className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-transform",
                          done ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card hover:bg-muted/60",
                          isCelebrating && "scale-125")}
                      >
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sprout className="h-3 w-3 text-muted-foreground" />}
                      </button>
                      <button onClick={() => setOpenId(h.id)} className={cn("min-w-0 flex-1 truncate text-left text-sm hover:text-primary", done && "line-through text-muted-foreground")}>
                        {h.title}
                      </button>
                      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px]", slotMeta.chip)}>
                        <slotMeta.Icon className="h-2.5 w-2.5" /> {slotMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs tabular-nums">
                      {h.streak || 0} <Flame className="h-3 w-3 text-amber-500" />
                    </div>
                    <button
                      onClick={() => completeToday(h)}
                      className={cn("grid h-6 w-6 place-items-center rounded-full border transition-transform",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-border/70 hover:bg-muted/60",
                        isCelebrating && "scale-125")}
                      aria-label="Mark today"
                    >
                      {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Celebrate footer */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sprout className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-semibold">
              {stats.pct === 100 ? "You did it — every habit, every day." :
               stats.pct >= 60 ? "Small steps, every day." :
               stats.pct >= 20 ? "Roots are forming. Keep going." :
                                 "Plant a tiny seed today."}
            </div>
            <div className="text-[11px] text-muted-foreground">You're building something amazing.</div>
          </div>
          <Link to="/habits" className="rounded-lg border border-border/60 bg-card/70 px-2.5 py-1 text-[11px] hover:bg-card">Explore habit ideas</Link>
        </div>
      </section>
      <HabitDetailSheet habitId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </>
  );
}

function KpiCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm">
      <div className="mb-2 text-[11px] font-medium text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} stroke="currentColor" className="text-muted/40" strokeWidth="5" fill="none" />
        <circle cx="28" cy="28" r={r} stroke="currentColor" className="text-primary transition-[stroke-dashoffset] duration-700" strokeWidth="5" strokeLinecap="round" fill="none" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute font-display text-xs font-semibold tabular-nums">{pct}%</div>
    </div>
  );
}

function TabPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/60")}>
      {children}
    </button>
  );
}

function SlotTab({ active, label, Icon, chip, onClick, onDropHabit }: {
  active: boolean; label: string; Icon: React.ComponentType<{ className?: string }>; chip: string;
  onClick: () => void; onDropHabit: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const id = e.dataTransfer.getData("text/habit-id");
        if (id) onDropHabit(id);
      }}
      className={cn("shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card/60 hover:bg-muted/60",
        over && "ring-2 ring-primary/40 scale-[1.02]")}
    >
      <Icon className={cn("h-3.5 w-3.5", chip)} />
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </button>
  );
}