import { useMemo, useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Link } from "react-router-dom";
import {
  Clock, CloudSun, CalendarClock, CalendarDays, ListTodo, UtensilsCrossed,
  Plus, Sparkles, Star, ChevronLeft, ChevronRight, ArrowRight, Moon, BookHeart,
  FileText, StickyNote, PenLine, Sunrise, Sun, Sandwich, Apple, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { JournalEntryDialog } from "@/components/journal/JournalEntryDialog";
import { RecipeDrawer } from "@/components/meals/RecipeDrawer";
import { useStore, todayISO } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { getDailyEnergyGuidance } from "@/lib/daily-energy-guidance";
import { getOrCreateDailyNote, createNote } from "@/lib/notes";
import { useMealsLibrary } from "@/lib/meals-library";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, Meal } from "@/lib/types";

/** ----------------------------------------------------------------
 *  Today page — calm daily command center
 *  Centered hero, triptych (Moon | Energy | Cycle), 3-column dashboard.
 *  --------------------------------------------------------------- */
export function RhythmDashboard({
  date,
  onDateChange,
  isReallyToday,
  onTaskClick,
  onApptClick,
}: {
  date: Date;
  onDateChange: (d: Date) => void;
  isReallyToday: boolean;
  onTaskClick: (id: string) => void;
  onApptClick: (id: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-1 sm:px-2">
      <Hero date={date} onDateChange={onDateChange} isReallyToday={isReallyToday} />
      <Triptych date={date} />
      <div className="grid gap-6 lg:grid-cols-3">
        <ScheduleColumn date={date} onTaskClick={onTaskClick} onApptClick={onApptClick} />
        <ProgressTasksColumn date={date} onTaskClick={onTaskClick} />
        <div className="space-y-6">
          <MealsColumn date={date} />
          <UpcomingColumn date={date} />
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
 * Hero
 * =================================================================== */
function Hero({
  date, onDateChange, isReallyToday,
}: { date: Date; onDateChange: (d: Date) => void; isReallyToday: boolean }) {
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date());
  useMemo(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;

  return (
    <section className="relative text-center">
      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        <Sparkles className="mr-1.5 inline h-3 w-3 text-primary" />
        {personalGreeting(state.settings.name)}
      </p>
      <h1 className="mt-3 font-display text-[2.25rem] font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
        {format(date, "EEEE, MMMM d")}
      </h1>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-foreground/80 sm:text-base">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          <span className="tabular-nums font-medium">{format(now, "h:mm a")}</span>
        </span>
        {tempStr && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CloudSun className="h-4 w-4 text-primary" />
              <span className="tabular-nums font-medium">{tempStr}</span>
              {snap?.conditionLabel && (
                <span className="text-muted-foreground">{snap.conditionLabel}</span>
              )}
            </span>
          </>
        )}
      </div>
      <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/60 p-0.5 backdrop-blur">
        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full"
          onClick={() => onDateChange(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {!isReallyToday && (
          <Button size="sm" variant="ghost" className="h-7 rounded-full px-3 text-xs"
            onClick={() => onDateChange(new Date())}>Today</Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full"
          onClick={() => onDateChange(addDays(date, 1))} aria-label="Next day">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

/* =====================================================================
 * Triptych — Moon | Daily Energy | Cycle (single card, 3 equal panels)
 * =================================================================== */
function Triptych({ date }: { date: Date }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-border/40 bg-card/55 shadow-soft backdrop-blur-xl",
        "transition-all hover:shadow-lg",
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 0% 0%, hsl(var(--primary)/0.10), transparent 55%)," +
          "radial-gradient(120% 90% at 100% 100%, hsl(var(--accent)/0.10), transparent 55%)",
      }}
    >
      <div className="grid grid-cols-1 divide-y divide-border/40 md:grid-cols-[1fr_1.6fr_1fr] md:divide-x md:divide-y-0">
        <MoonPanel date={date} />
        <EnergyPanel date={date} />
        <CyclePanel date={date} />
      </div>
    </section>
  );
}

function MoonPanel({ date }: { date: Date }) {
  const phase = getMoonPhase(date);
  const info = MOON_INFO[phase];
  const illum = getIllumination(date);
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-7 text-center">
      <MoonGlyph date={date} size={56} />
      <p className="font-display text-[11px] italic uppercase tracking-[0.24em] text-muted-foreground">Moon</p>
      <p className="font-display text-xl font-semibold text-foreground">{info.label}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
        {illum}% lit
      </p>
    </div>
  );
}

function EnergyPanel({ date }: { date: Date }) {
  const { periods, settings } = useCycle();
  const g = useMemo(() => getDailyEnergyGuidance(date, periods, settings), [date, periods, settings]);
  const navigate = useNavigate();
  const { addJournal } = useStore();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState<null | "daily" | "new" | "save">(null);

  const openDailyNote = async () => {
    try { setBusy("daily"); const n = await getOrCreateDailyNote(todayISO()); navigate(`/notes/${n.id}`); }
    catch { toast.error("Couldn't open today's note"); } finally { setBusy(null); }
  };
  const newSeededNote = async () => {
    try {
      setBusy("new");
      const n = await createNote({ title: g.headline.slice(0, 80), body: `> ${g.reflection}\n\n` });
      navigate(`/notes/${n.id}`);
    } catch { toast.error("Couldn't create note"); } finally { setBusy(null); }
  };
  const saveJournal = async () => {
    const body = journalText.trim();
    if (!body) { setJournalOpen(false); return; }
    try {
      setBusy("save");
      await addJournal({ body: `Reflection: ${g.reflection}\n\n${body}`, type: "brain-dump", date: todayISO() });
      toast.success("Saved to journal"); setJournalText(""); setJournalOpen(false);
    } catch { toast.error("Couldn't save"); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-7 text-center">
      <div className="inline-flex items-center gap-1.5 text-primary">
        <Moon className="h-3 w-3" />
        <p className="text-[10px] uppercase tracking-[0.28em]">Daily Energy</p>
      </div>
      <blockquote className="text-balance font-display text-lg italic leading-snug text-foreground/90 sm:text-xl">
        “{g.headline}”
      </blockquote>
      <p className="font-display text-[13px] italic leading-snug text-foreground/70">
        “{g.reflection}”
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {g.focus.map((w, i) => (
          <span key={w} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/40">·</span>}
            <span>{w}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        <ChipBtn onClick={() => setJournalOpen(v => !v)} icon={<BookHeart className="h-3 w-3" />} label="Journal this" />
        <ChipBtn onClick={() => setEditorOpen(true)} icon={<PenLine className="h-3 w-3" />} label="Open editor" />
        <ChipBtn onClick={openDailyNote} icon={busy === "daily" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} label="Today's note" />
        <ChipBtn onClick={newSeededNote} icon={busy === "new" ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" />} label="New note" />
      </div>
      {journalOpen && (
        <div className="w-full max-w-md animate-in fade-in duration-200">
          <Textarea
            value={journalText} onChange={(e) => setJournalText(e.target.value)}
            placeholder="A line for today…" rows={3} autoFocus
            className="min-h-[72px] resize-none rounded-xl border-border/50 bg-background/70 text-sm"
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button type="button" onClick={() => { setJournalOpen(false); setJournalText(""); }}
              className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="button" onClick={saveJournal} disabled={!journalText.trim() || busy === "save"}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft transition disabled:opacity-40">
              {busy === "save" && <Loader2 className="h-3 w-3 animate-spin" />} Save
            </button>
          </div>
        </div>
      )}
      <JournalEntryDialog
        open={editorOpen} onOpenChange={setEditorOpen} date={date}
        seedTitle={g.headline.slice(0, 80)} seedBody={g.reflection}
        defaultTags={["daily-energy", g.element.toLowerCase()]} defaultType="daily"
      />
    </div>
  );
}

function ChipBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60",
        "px-3 py-1.5 text-[11px] font-medium text-foreground/80 transition",
        "hover:border-primary/40 hover:bg-background hover:text-foreground hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]",
      )}
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}

function CyclePanel({ date }: { date: Date }) {
  const { periods, settings } = useCycle();
  const cycle = useMemo(() => { try { return getPhaseInfo(date, periods, settings); } catch { return null; } },
    [date, periods, settings]);
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-7 text-center">
      <span aria-hidden className="text-4xl leading-none">🌷</span>
      <p className="font-display text-[11px] italic uppercase tracking-[0.24em] text-muted-foreground">Cycle</p>
      {cycle ? (
        <>
          <p className="font-display text-xl font-semibold text-foreground">Day {cycle.cycleDay}</p>
          <p className="text-[10px] uppercase tracking-[0.2em]"
             style={{ color: `hsl(var(${PHASE_META[cycle.phase].tokenVar}))` }}>
            {PHASE_META[cycle.phase].label}
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-base text-muted-foreground">Not tracking</p>
          <Link to="/health" className="text-[10px] uppercase tracking-[0.2em] text-primary hover:underline">
            Log to track
          </Link>
        </>
      )}
    </div>
  );
}

/* =====================================================================
 * Column 1 — Schedule
 * =================================================================== */
function ScheduleColumn({
  date, onTaskClick, onApptClick,
}: { date: Date; onTaskClick: (id: string) => void; onApptClick: (id: string) => void }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const now = new Date();
  const items = useMemo(() => {
    const rows: { id: string; time?: string; label: string; kind: "appt" | "task"; durationMin?: number; done?: boolean }[] = [];
    for (const a of state.appointments ?? []) {
      if ((a.date ?? "") !== iso) continue;
      let dur: number | undefined;
      if (a.time && a.endTime) {
        const [sh, sm] = a.time.split(":").map(Number);
        const [eh, em] = a.endTime.split(":").map(Number);
        dur = (eh * 60 + em) - (sh * 60 + sm);
      }
      rows.push({ id: a.id, time: a.time ?? undefined, label: a.title, kind: "appt", durationMin: dur });
    }
    for (const t of state.tasks) {
      if (t.dueDate !== iso || t.parentTaskId || t.status === "parked") continue;
      if (!t.startTime && !(t as any).dueTime) continue;
      rows.push({
        id: t.id, time: t.startTime ?? (t as any).dueTime, label: t.title, kind: "task",
        durationMin: t.estMinutes, done: t.done,
      });
    }
    rows.sort((a, b) => (a.time ?? "zz").localeCompare(b.time ?? "zz"));
    return rows;
  }, [state.appointments, state.tasks, iso]);

  // current row = the latest item whose time has already passed (today only)
  const currentIdx = useMemo(() => {
    if (iso !== format(now, "yyyy-MM-dd")) return -1;
    const hm = format(now, "HH:mm");
    let idx = -1;
    items.forEach((r, i) => { if (r.time && r.time <= hm) idx = i; });
    return idx;
  }, [items, iso, now]);

  return (
    <Card>
      <CardHeader
        icon={<CalendarClock className="h-4 w-4" />}
        title="Today's Schedule"
        action={<Link to="/calendar" className="text-[11px] uppercase tracking-wider text-primary/80 hover:text-primary">View calendar</Link>}
      />
      {items.length === 0 ? (
        <EmptyState text="No events scheduled." />
      ) : (
        <ul className="relative space-y-3 pl-1">
          <span aria-hidden className="absolute left-[3.4rem] top-2 bottom-2 w-px bg-border/60" />
          {items.map((r, i) => {
            const isNow = i === currentIdx;
            return (
              <li key={`${r.kind}-${r.id}`} className="relative grid grid-cols-[3rem_auto_1fr_auto] items-center gap-3">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {r.time ? format12(r.time) : "—"}
                </span>
                <span
                  className={cn(
                    "relative z-10 h-2.5 w-2.5 rounded-full transition-all",
                    isNow
                      ? "bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18),0_0_18px_hsl(var(--primary)/0.55)] animate-pulse"
                      : r.kind === "appt"
                        ? "bg-accent/80"
                        : "bg-primary/50",
                  )}
                />
                <button
                  type="button"
                  onClick={() => r.kind === "task" ? onTaskClick(r.id) : onApptClick(r.id)}
                  className={cn(
                    "min-w-0 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary",
                    r.done && "text-muted-foreground line-through",
                  )}
                >
                  {r.label}
                </button>
                {r.durationMin ? (
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isNow ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground",
                  )}>
                    {fmtDur(r.durationMin)}
                  </span>
                ) : <span />}
              </li>
            );
          })}
        </ul>
      )}
      <CardFooter>
        <FooterAction icon={<Plus className="h-3.5 w-3.5" />} label="Add Event" to="/calendar?new=appt" />
      </CardFooter>
    </Card>
  );
}

function format12(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}
function fmtDur(min: number) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const r = min % 60;
    return r ? `${h}h ${r}m` : `${h} hr`;
  }
  return `${min} min`;
}

/* =====================================================================
 * Column 2 — Progress + Tasks
 * =================================================================== */
function ProgressTasksColumn({
  date, onTaskClick,
}: { date: Date; onTaskClick: (id: string) => void }) {
  const { state, toggleTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const tasks = useMemo(() => {
    return state.tasks
      .filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked")
      .sort((a, b) => Number(a.done) - Number(b.done));
  }, [state.tasks, iso]);

  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const projectName = (id?: string) => id ? state.projects.find(p => p.id === id)?.name : undefined;

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = async () => {
    const v = draft.trim();
    if (!v) { setAdding(false); return; }
    await addTask({ title: v, dueDate: iso, priority: "med", area: "general" } as any);
    setDraft(""); setAdding(false);
  };

  return (
    <Card>
      <CardHeader
        icon={<ListTodo className="h-4 w-4" />}
        title="Today's Progress"
        action={
          <span className="text-[11px] font-semibold tabular-nums text-primary">{pct}%</span>
        }
      />
      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {done} of {total || 0} completed
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-foreground">
          Today's Tasks <span className="ml-1 text-xs text-muted-foreground">{total}</span>
        </h4>
        <Link to="/tasks" className="text-[11px] uppercase tracking-wider text-primary/80 hover:text-primary">View all</Link>
      </div>

      {tasks.length === 0 && !adding ? (
        <EmptyState text="Nothing on the list yet." />
      ) : (
        <ul className="mt-2 space-y-1">
          {tasks.map(t => (
            <TaskRow key={t.id} t={t} project={projectName(t.projectId)} onToggle={() => void toggleTask(t.id)} onOpen={() => onTaskClick(t.id)} />
          ))}
        </ul>
      )}

      <CardFooter>
        {adding ? (
          <Input
            autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") void commit(); if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            placeholder="What needs doing?" className="h-8 rounded-full bg-background/70 text-xs"
          />
        ) : (
          <FooterAction icon={<Plus className="h-3.5 w-3.5" />} label="Add Task" onClick={() => setAdding(true)} />
        )}
      </CardFooter>
    </Card>
  );
}

function TaskRow({
  t, project, onToggle, onOpen,
}: { t: Task; project?: string; onToggle: () => void; onOpen: () => void }) {
  const { updateTask } = useStore();
  const priorityTone: Record<string, string> = {
    high: "bg-rose-500/15 text-rose-500 ring-rose-500/30",
    med:  "bg-amber-500/15 text-amber-500 ring-amber-500/30",
    low:  "bg-sky-500/15 text-sky-500 ring-sky-500/30",
  };
  return (
    <li
      className={cn(
        "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition",
        "hover:bg-muted/40",
        t.done && "opacity-55",
      )}
    >
      <Checkbox checked={t.done} onCheckedChange={onToggle} className="h-4 w-4 rounded-md" />
      <button
        type="button" onClick={onOpen}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary",
          t.done && "line-through text-muted-foreground",
        )}
      >
        {t.title}
      </button>
      <span className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1",
        priorityTone[t.priority] ?? priorityTone.med,
      )}>
        {t.priority}
      </span>
      {project && (
        <span className="hidden shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          {project}
        </span>
      )}
      {t.estMinutes ? (
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{t.estMinutes}m</span>
      ) : null}
      <button
        type="button"
        onClick={() => void updateTask(t.id, { isTopThree: !t.isTopThree })}
        className={cn(
          "shrink-0 rounded-full p-0.5 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:text-amber-400",
          t.isTopThree && "text-amber-400 opacity-100",
        )}
        title="Star"
      >
        <Star className={cn("h-3.5 w-3.5", t.isTopThree && "fill-current")} />
      </button>
    </li>
  );
}

/* =====================================================================
 * Column 3 — Meals
 * =================================================================== */
const MEAL_SLOTS: { slot: "Breakfast" | "Lunch" | "Dinner" | "Snack"; icon: typeof Sunrise }[] = [
  { slot: "Breakfast", icon: Sunrise },
  { slot: "Lunch", icon: Sun },
  { slot: "Dinner", icon: Moon },
  { slot: "Snack", icon: Apple },
];

function MealsColumn({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const { state } = useStore();
  const meals = state.meals.filter(m => m.date === iso);

  return (
    <Card>
      <CardHeader icon={<UtensilsCrossed className="h-4 w-4" />} title="Today's Meals" />
      <ul className="space-y-2">
        {MEAL_SLOTS.map(({ slot, icon: Icon }) => {
          const m = meals.find(x => x.slot === slot) ?? null;
          return <MealCard key={slot} date={date} slot={slot} Icon={Icon} meal={m} />;
        })}
      </ul>
    </Card>
  );
}

function MealCard({
  date, slot, Icon, meal,
}: { date: Date; slot: "Breakfast" | "Lunch" | "Dinner" | "Snack"; Icon: typeof Sunrise; meal: Meal | null }) {
  const iso = format(date, "yyyy-MM-dd");
  const { addMeal, deleteMeal } = useStore();
  const { items: library } = useMealsLibrary();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = library.filter(m => !m.slot || m.slot === slot);
    if (!q) return base.slice(0, 8);
    return library.filter(m => m.title.toLowerCase().includes(q)).slice(0, 8);
  }, [library, query, slot]);

  const add = async (name: string) => {
    await addMeal({ name, date: iso, slot });
    toast.success(`Added ${slot.toLowerCase()}: ${name}`);
  };

  const preview = meal?.ingredients?.length ? meal.ingredients.slice(0, 3).join(", ") : (meal?.name ? "Tap to view" : "Tap + to plan");

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-border/40 bg-background/55 px-3 py-2.5",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/75 hover:shadow-md",
      )}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <button
        type="button"
        onClick={() => meal ? setDrawerOpen(true) : setOpen(true)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{slot}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{meal?.name ?? preview}</p>
        {meal?.name && meal.ingredients?.length ? (
          <p className="truncate text-[10px] text-muted-foreground/80">{meal.ingredients.slice(0, 3).join(" · ")}</p>
        ) : null}
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
            aria-label={`${meal ? "Change" : "Add"} ${slot.toLowerCase()}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 rounded-2xl p-3">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium">
            <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> Plan {slot.toLowerCase()}
          </div>
          <Input
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library or type a meal…" className="h-8 rounded-lg text-xs"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && query.trim()) {
                e.preventDefault();
                await add(query.trim()); setQuery(""); setOpen(false);
              }
            }}
          />
          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                {query ? "Press Enter to add." : "Type to add a meal."}
              </p>
            )}
            {filtered.map(lib => (
              <button
                key={lib.id} type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10"
                onClick={async () => { await add(lib.title); setOpen(false); }}
              >
                <Sandwich className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{lib.title}</span>
              </button>
            ))}
          </div>
          {meal && (
            <button
              type="button" onClick={() => { void deleteMeal(meal.id); setOpen(false); }}
              className="mt-2 w-full rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive"
            >Clear {slot.toLowerCase()}</button>
          )}
        </PopoverContent>
      </Popover>
      <RecipeDrawer meal={drawerOpen ? meal ?? null : null} onClose={() => setDrawerOpen(false)} onChanged={() => {}} />
    </li>
  );
}

/* =====================================================================
 * Upcoming — under Meals
 * =================================================================== */
function UpcomingColumn({ date }: { date: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const events = useMemo(() => state.appointments
    .filter(a => a.date > iso)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, 5),
  [state.appointments, iso]);

  return (
    <Card>
      <CardHeader
        icon={<CalendarDays className="h-4 w-4" />}
        title="Upcoming"
        action={<Link to="/calendar" className="text-[11px] uppercase tracking-wider text-primary/80 hover:text-primary">View calendar</Link>}
      />
      {events.length === 0 ? (
        <EmptyState text="Nothing on the horizon." />
      ) : (
        <ul className="space-y-3">
          {events.map(e => {
            const d = parseISO(e.date);
            const dayLabel = relativeDay(d);
            return (
              <li key={e.id} className="flex items-center gap-3">
                <div className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {dayLabel}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{e.title}</div>
                  {e.location && <div className="truncate text-[11px] text-muted-foreground">{e.location}</div>}
                </div>
                <div className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {e.allDay ? "All day" : e.time ? format12(e.time) : ""}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function relativeDay(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return format(d, "EEEE");
  return format(d, "EEE, MMM d");
}

/* =====================================================================
 * Shared primitives
 * =================================================================== */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/40 bg-card/55 p-6 shadow-soft backdrop-blur-xl",
        "transition-all duration-200 hover:border-border/70 hover:shadow-md",
      )}
    >
      {children}
    </section>
  );
}
function CardHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="inline-flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  );
}
function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 border-t border-border/40 pt-4">{children}</div>;
}
function FooterAction({ icon, label, to, onClick }: { icon: React.ReactNode; label: string; to?: string; onClick?: () => void }) {
  const cls = cn(
    "inline-flex w-full items-center justify-center gap-1.5 rounded-full",
    "py-1.5 text-xs font-semibold text-primary transition-colors",
    "hover:bg-primary/10",
  );
  if (to) return <Link to={to} className={cls}>{icon}{label}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{icon}{label}</button>;
}
function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border/50 px-3 py-5 text-center text-xs text-muted-foreground">
      {text}
    </p>
  );
}