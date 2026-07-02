import { useEffect, useMemo, useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Link } from "react-router-dom";
import {
  Clock, CloudSun, CalendarClock, CalendarDays, ListTodo, UtensilsCrossed,
  Plus, Sparkles, Star, ChevronLeft, ChevronRight, ArrowRight, Moon, BookHeart,
  FileText, StickyNote, PenLine, Sunrise, Sun, Sandwich, Apple, Loader2,
  Heart, Activity, Droplet, Zap, Pill, Footprints, Target, ChevronRight as ChevronRightIcon,
  ShoppingBasket, Sparkle, Leaf, Users, Sparkles as SparklesIcon, Brush, Palette, Sprout,
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
import { getMoonSign, SIGN_EMOJI, ELEMENT_EMOJI, ELEMENT_ARCHETYPE, SIGN_KEYWORDS } from "@/lib/zodiac";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { getDailyEnergyGuidance } from "@/lib/daily-energy-guidance";
import { getOrCreateDailyNote, createNote } from "@/lib/notes";
import { useMealsLibrary } from "@/lib/meals-library";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, Meal } from "@/lib/types";
import { getIntention, setIntention as saveIntention } from "@/lib/daily-intention";
import { getCheckIn, setCheckIn, type DailyCheckIn } from "@/lib/daily-checkin";
import { SlotWeather } from "@/components/today/rhythm/SlotWeather";
import { TodayHabitsCard } from "@/components/today/TodayHabitsCard";
import { routines as routinesApi } from "@/lib/routines";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
  slot,
  debrief,
}: {
  date: Date;
  onDateChange: (d: Date) => void;
  isReallyToday: boolean;
  onTaskClick: (id: string) => void;
  onApptClick: (id: string) => void;
  slot?: React.ReactNode;
  debrief?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-1 sm:px-2">
      <Hero date={date} onDateChange={onDateChange} isReallyToday={isReallyToday} />
      <Triptych date={date} />
      {slot}
      {debrief}
      {/* Row 1 — Intention · Check-In · Goals */}
      <div className="grid gap-6 lg:grid-cols-4">
        <IntentionCard date={date} />
        <div className="lg:col-span-2"><DailyCheckInCard date={date} /></div>
        <GoalCheckInCard />
      </div>
      {/* Row 2 — Schedule · Progress · Meals · Projects */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6">
          <ScheduleColumn date={date} onTaskClick={onTaskClick} onApptClick={onApptClick} />
          <HabitsRoutinesCard date={date} />
          <UpcomingColumn date={date} />
        </div>
        <ProgressTasksColumn date={date} onTaskClick={onTaskClick} />
        <div className="space-y-6">
          <MealsColumn date={date} />
          <GroceryCard />
        </div>
        <div className="space-y-6">
          <InProgressProjectsCard />
          <CurrentProjectFocusCard />
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
  useEffect(() => {
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
export function Triptych({ date }: { date: Date }) {
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
  const sign = useMemo(() => getMoonSign(date), [date]);
  const keywords = MOON_KEYWORDS[phase];
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-7 text-center">
      <MoonGlyph date={date} size={56} />
      <p className="font-display text-[11px] italic uppercase tracking-[0.24em] text-muted-foreground">Moon</p>
      <p className="font-display text-xl font-semibold text-foreground">{info.label}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
        {illum}% lit
      </p>
      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[11px] text-foreground/85">
        <span aria-hidden>{SIGN_EMOJI[sign.name]}</span>
        <span className="font-medium">{sign.name}</span>
        <span className="text-muted-foreground/60">·</span>
        <span aria-hidden>{ELEMENT_EMOJI[sign.element]}</span>
        <span className="text-muted-foreground">{sign.element}</span>
      </div>
      <p className="mt-1 max-w-[16rem] text-balance text-[11px] leading-snug text-foreground/70">
        {ELEMENT_ARCHETYPE[sign.element]}
      </p>
      <p className="mt-1 max-w-[16rem] text-balance font-display text-[12px] italic leading-snug text-foreground/75">
        {info.invitation}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
        {keywords.map((k) => (
          <span key={k} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary/90">
            {k}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1 border-t border-border/30 pt-2">
        {SIGN_KEYWORDS[sign.name].map((k) => (
          <span
            key={k}
            className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-foreground/70"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

const MOON_KEYWORDS: Record<ReturnType<typeof getMoonPhase>, string[]> = {
  "new": ["intention", "begin", "quiet"],
  "waxing-crescent": ["stir", "tend", "build"],
  "first-quarter": ["decide", "act", "commit"],
  "waxing-gibbous": ["refine", "adjust", "focus"],
  "full": ["illuminate", "feel", "release"],
  "waning-gibbous": ["share", "gratitude", "exhale"],
  "last-quarter": ["release", "clear", "let go"],
  "waning-crescent": ["rest", "reflect", "soften"],
};

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
  const meta = cycle ? PHASE_META[cycle.phase] : null;
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-7 text-center">
      <span aria-hidden className="text-4xl leading-none">{meta?.glyph ?? "🌷"}</span>
      <p className="font-display text-[11px] italic uppercase tracking-[0.24em] text-muted-foreground">Cycle</p>
      {cycle && meta ? (
        <>
          <p className="font-display text-xl font-semibold text-foreground">Day {cycle.cycleDay}</p>
          <p className="text-[10px] uppercase tracking-[0.2em]"
             style={{ color: `hsl(var(${meta.tokenVar}))` }}>
            {meta.label}
          </p>
          <p className="mt-1 max-w-[16rem] text-balance font-display text-[12px] italic leading-snug text-foreground/75">
            {meta.invitation}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
            {meta.planningHints.slice(0, 3).map((k) => (
              <span
                key={k}
                className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                style={{
                  background: `hsl(var(${meta.tokenVar}) / 0.14)`,
                  color: `hsl(var(${meta.tokenVar}))`,
                }}
              >
                {k}
              </span>
            ))}
          </div>
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

  const groups = useMemo(() => {
    const g: Record<"Morning" | "Afternoon" | "Evening", typeof items> = {
      Morning: [], Afternoon: [], Evening: [],
    };
    for (const r of items) {
      const h = r.time ? Number(r.time.slice(0, 2)) : 12;
      if (h < 12) g.Morning.push(r);
      else if (h < 17) g.Afternoon.push(r);
      else g.Evening.push(r);
    }
    return g;
  }, [items]);

  const SLOTS: { label: "Morning" | "Afternoon" | "Evening"; icon: string }[] = [
    { label: "Morning", icon: "☀️" },
    { label: "Afternoon", icon: "🌤" },
    { label: "Evening", icon: "🌙" },
  ];

  return (
    <Card>
      <CardHeader
        icon={<CalendarClock className="h-4 w-4" />}
        title="Today's Schedule"
        action={<Link to="/calendar" className="text-[11px] uppercase tracking-wider text-primary/80 hover:text-primary">View calendar</Link>}
      />
      <div className="space-y-5">
        {SLOTS.map(({ label, icon }, si) => {
          const rows = groups[label];
          const weatherSlot = label.toLowerCase() as "morning" | "afternoon" | "evening";
          return (
            <div key={label}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                <span aria-hidden>{icon}</span>{label}
              </div>
              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 px-3 py-3 text-center text-[11px] text-muted-foreground">
                  No events scheduled.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {rows.map((r) => {
                    const isNow = items.indexOf(r) === currentIdx;
                    return (
                      <ScheduleRow
                        key={`${r.kind}-${r.id}`}
                        row={r}
                        isNow={isNow}
                        onOpen={() => r.kind === "task" ? onTaskClick(r.id) : onApptClick(r.id)}
                      />
                    );
                  })}
                </ul>
              )}
              <Link
                to="/calendar?new=appt"
                className="mt-1.5 flex items-center justify-center gap-1 rounded-full py-1 text-[11px] font-medium text-primary/80 hover:bg-primary/10 hover:text-primary"
              >
                <Plus className="h-3 w-3" /> Add Event
              </Link>
              <div className="mt-2">
                <SlotWeather slot={weatherSlot} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Schedule row with inline note editing, checkbox for tasks, and consistent hover UX. */
function ScheduleRow({
  row, isNow, onOpen,
}: {
  row: { id: string; time?: string; label: string; kind: "appt" | "task"; durationMin?: number; done?: boolean };
  isNow: boolean;
  onOpen: () => void;
}) {
  const { state, toggleTask, updateTask, updateAppointment } = useStore();
  const source = row.kind === "task"
    ? state.tasks.find(t => t.id === row.id)
    : state.appointments.find(a => a.id === row.id);
  const notes: string = (source as any)?.notes ?? "";
  const [showNote, setShowNote] = useState(!!notes);
  const [draft, setDraft] = useState(notes);
  useEffect(() => { setDraft(notes); }, [notes]);

  const persistNote = async () => {
    if (draft === notes) return;
    if (row.kind === "task") await updateTask(row.id, { notes: draft } as any);
    else await updateAppointment(row.id, { notes: draft } as any);
  };

  return (
    <li
      className={cn(
        "group rounded-xl border border-border/40 bg-background/50 px-3 py-2 transition",
        "hover:border-primary/40 hover:bg-background/80",
        isNow && "border-primary/50 shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]",
      )}
    >
      <div className="flex items-start gap-2.5">
        {row.kind === "task" ? (
          <Checkbox
            checked={!!row.done}
            onCheckedChange={() => void toggleTask(row.id)}
            className="mt-1 h-4 w-4"
          />
        ) : (
          <span
            aria-hidden
            className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary/60"
          />
        )}
        <span className="mt-0.5 shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
          {row.time ? format12(row.time) : "—"}
        </span>
        <button
          type="button" onClick={onOpen}
          className={cn(
            "min-w-0 flex-1 whitespace-normal break-words text-left text-sm font-medium text-foreground transition-colors hover:text-primary",
            row.done && "text-muted-foreground line-through",
          )}
        >
          {row.label}
        </button>
        {row.durationMin ? (
          <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {fmtDur(row.durationMin)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setShowNote(v => !v)}
          className={cn(
            "shrink-0 rounded-full p-0.5 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100 hover:bg-primary/10 hover:text-primary",
            (showNote || notes) && "opacity-100",
          )}
          aria-label="Toggle note"
          title="Add / edit note"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      </div>
      {showNote && (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={persistNote}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void persistNote(); }
          }}
          placeholder="Add a note…"
          rows={2}
          className="mt-2 min-h-[44px] resize-none rounded-xl border-border/40 bg-background/70 text-[12px] leading-snug"
        />
      )}
    </li>
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
          "min-w-0 flex-1 whitespace-normal break-words text-left text-sm font-medium text-foreground transition-colors hover:text-primary",
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
  const navigate = useNavigate();
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
        <ul className="space-y-1.5">
          {events.map(e => {
            const d = parseISO(e.date);
            const dayLabel = relativeDay(d);
            return (
              <li
                key={e.id}
                className="group flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 px-3 py-2 transition hover:border-primary/40 hover:bg-background/80"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary/60"
                />
                <div className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {dayLabel}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/calendar?appt=${e.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="whitespace-normal break-words text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {e.title}
                  </div>
                  {e.location && (
                    <div className="truncate text-[11px] text-muted-foreground">{e.location}</div>
                  )}
                </button>
                <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {e.allDay ? "All day" : e.time ? format12(e.time) : ""}
                </span>
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

/* =====================================================================
 * Daily Plan Intention
 * =================================================================== */
function IntentionCard({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const [text, setText] = useState(() => getIntention(iso));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  useEffect(() => {
    const v = getIntention(iso);
    setText(v); setDraft(v); setEditing(false);
  }, [iso]);

  const commit = () => {
    const v = draft.trim();
    saveIntention(iso, v); setText(v); setEditing(false);
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/55 p-6 shadow-soft backdrop-blur-xl transition hover:border-border/70 hover:shadow-md"
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 0% 0%, hsl(var(--primary)/0.10), transparent 55%)," +
          "radial-gradient(120% 90% at 100% 100%, hsl(var(--accent)/0.10), transparent 55%)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-semibold text-foreground">Daily Plan Intention</h3>
      </div>
      {editing ? (
        <>
          <Textarea
            autoFocus rows={4} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit(); }}
            placeholder="Choose focus. Set the tone. Let today flow with purpose."
            className="min-h-[96px] resize-none rounded-2xl border-border/50 bg-background/70 text-sm leading-relaxed"
          />
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={commit}
              className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft">
              Save
            </button>
          </div>
        </>
      ) : (
        <button
          type="button" onClick={() => { setDraft(text); setEditing(true); }}
          className="group block w-full rounded-2xl border border-border/40 bg-background/40 p-4 text-left transition hover:border-primary/40"
        >
          <p className={cn(
            "font-display text-sm leading-relaxed",
            text ? "text-foreground/90 italic" : "text-muted-foreground",
          )}>
            {text || "Choose focus. Set the tone. Let today flow with purpose."}
          </p>
          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary/80 group-hover:text-primary">
            <PenLine className="h-3 w-3" /> Edit
          </div>
        </button>
      )}
    </section>
  );
}

/* =====================================================================
 * Daily Check-In — Sleep · Water · Energy · Medicine · Movement
 * =================================================================== */
function DailyCheckInCard({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const [ci, setCi] = useState<DailyCheckIn>(() => getCheckIn(iso));
  useEffect(() => { setCi(getCheckIn(iso)); }, [iso]);
  const patch = (p: Partial<DailyCheckIn>) => setCi(setCheckIn(iso, p));

  return (
    <Card>
      <CardHeader icon={<Activity className="h-4 w-4" />} title="Daily Check-In" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricStepper
          icon={<Moon className="h-4 w-4" />} label="Sleep" unit="hrs"
          value={ci.sleepHours ?? 0} step={0.5} min={0} max={14}
          onChange={(v) => patch({ sleepHours: v })}
          format={(v) => v.toFixed(1)}
        />
        <MetricStepper
          icon={<Droplet className="h-4 w-4" />} label="Water" unit="cups"
          value={ci.waterCups ?? 0} step={1} min={0} max={24}
          onChange={(v) => patch({ waterCups: v })}
        />
        <MetricStepper
          icon={<Zap className="h-4 w-4" />} label="Energy" unit="/10"
          value={ci.energy ?? 0} step={1} min={0} max={10}
          onChange={(v) => patch({ energy: v })}
        />
        <button
          type="button"
          onClick={() => patch({ medicineDone: !ci.medicineDone })}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition",
            ci.medicineDone
              ? "border-primary/50 bg-primary/10"
              : "border-border/40 bg-background/40 hover:border-primary/40",
          )}
        >
          <Pill className={cn("h-4 w-4", ci.medicineDone ? "text-primary" : "text-muted-foreground")} />
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Medicine</span>
          <span className={cn("mt-0.5 font-display text-base font-semibold", ci.medicineDone ? "text-primary" : "text-foreground/80")}>
            {ci.medicineDone ? "Logged" : "Log"}
          </span>
        </button>
        <MetricStepper
          icon={<Footprints className="h-4 w-4" />} label="Movement" unit="mins"
          value={ci.movementMinutes ?? 0} step={5} min={0} max={480}
          onChange={(v) => patch({ movementMinutes: v })}
        />
      </div>
      <div className="mt-3">
        <Textarea
          value={ci.note ?? ""} onChange={(e) => patch({ note: e.target.value })}
          placeholder="Add a note…"
          rows={2}
          className="min-h-[52px] resize-none rounded-xl border-border/40 bg-background/50 text-xs"
        />
      </div>
    </Card>
  );
}

function MetricStepper({
  icon, label, unit, value, step, min, max, onChange, format,
}: {
  icon: React.ReactNode; label: string; unit: string;
  value: number; step: number; min: number; max: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const display = format ? format(value) : String(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n)) onChange(clamp(n));
    setEditing(false);
  };
  return (
    <div className="group flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-background/40 px-2 py-3 text-center transition hover:border-primary/40">
      <span className="text-primary">{icon}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-0.5 inline-flex items-center gap-1">
        <button
          type="button" aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className="h-5 w-5 rounded-full text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"
        >−</button>
        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
            }}
            className="w-12 rounded-md border border-border/50 bg-background/70 px-1 text-center font-display text-lg font-semibold tabular-nums text-foreground outline-none focus:border-primary/60"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="rounded-md px-1 font-display text-lg font-semibold tabular-nums text-foreground hover:bg-muted/40"
            title="Tap to edit"
          >
            {display}
          </button>
        )}
        <button
          type="button" aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className="h-5 w-5 rounded-full text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"
        >+</button>
      </div>
      <span className="text-[10px] text-muted-foreground">{unit}</span>
    </div>
  );
}

/* =====================================================================
 * Goal Check-In — progress rings per category
 * =================================================================== */
function GoalCheckInCard() {
  const { state } = useStore();
  const groups = useMemo(() => {
    const map = new Map<string, { total: number; sum: number; label: string }>();
    const groupOf: Record<string, string> = {
      Family: "Family & Relationships",
      Relationship: "Family & Relationships",
      Caregiving: "Family & Relationships",
      Health: "Health & Wellness",
      Home: "Health & Wellness",
      Personal: "Personal Growth",
      Creative: "Personal Growth",
      Financial: "Personal Growth",
    };
    for (const g of state.goals ?? []) {
      if (g.status !== "active") continue;
      const key = groupOf[g.category] ?? "Personal Growth";
      const cur = map.get(key) ?? { total: 0, sum: 0, label: key };
      cur.total += 1; cur.sum += Math.max(0, Math.min(100, g.progress ?? 0));
      map.set(key, cur);
    }
    const order = ["Health & Wellness", "Family & Relationships", "Personal Growth"];
    return order.map(k => {
      const v = map.get(k);
      return { label: k, pct: v && v.total ? Math.round(v.sum / v.total) : 0 };
    });
  }, [state.goals]);

  const RING_TONE: Record<string, string> = {
    "Health & Wellness": "hsl(var(--primary))",
    "Family & Relationships": "hsl(45 80% 60%)",
    "Personal Growth": "hsl(160 60% 55%)",
  };

  return (
    <Card>
      <CardHeader icon={<Target className="h-4 w-4" />} title="Goal Check-In" />
      <ul className="space-y-3">
        {groups.map(g => (
          <li key={g.label} className="flex items-center gap-3">
            <Ring pct={g.pct} color={RING_TONE[g.label]} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{g.label}</span>
            <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">{g.pct}%</span>
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </li>
        ))}
      </ul>
      <CardFooter>
        <FooterAction icon={<Plus className="h-3.5 w-3.5" />} label="Add Goal" to="/goals" />
      </CardFooter>
    </Card>
  );
}

function Ring({ pct, color, size = 36 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.4" strokeWidth="3" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 700ms ease" }}
      />
    </svg>
  );
}

/* =====================================================================
 * Grocery Card
 * =================================================================== */
function GroceryCard() {
  const { state, toggleGrocery, addGrocery } = useStore();
  const items = useMemo(
    () => [...state.grocery].sort((a, b) => Number(a.bought) - Number(b.bought)).slice(0, 6),
    [state.grocery],
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = async () => {
    const v = draft.trim();
    if (!v) { setAdding(false); return; }
    await addGrocery(v);
    setDraft(""); setAdding(false);
  };
  return (
    <Card>
      <CardHeader
        icon={<ShoppingBasket className="h-4 w-4" />}
        title="Grocery List"
        action={
          adding ? null : (
            <button
              type="button" onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary/80 hover:text-primary"
            ><Plus className="h-3 w-3" /> Add Item</button>
          )
        }
      />
      {items.length === 0 && !adding ? (
        <EmptyState text="Your list is empty." />
      ) : (
        <ul className="space-y-1.5">
          {items.map(i => (
            <li key={i.id} className="flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-muted/40">
              <Checkbox checked={i.bought} onCheckedChange={() => void toggleGrocery(i.id)} className="h-4 w-4" />
              <span className={cn(
                "min-w-0 flex-1 truncate text-sm",
                i.bought ? "text-muted-foreground line-through" : "text-foreground/90",
              )}>{i.name}</span>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <Input
          autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") void commit(); if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
          placeholder="Add grocery item…"
          className="mt-2 h-8 rounded-full bg-background/70 text-xs"
        />
      )}
      <CardFooter>
        <FooterAction icon={<ArrowRight className="h-3.5 w-3.5" />} label="View All" to="/home?tab=groceries" />
      </CardFooter>
    </Card>
  );
}

/* =====================================================================
 * In Progress Projects
 * =================================================================== */
function useProjectProgress() {
  const { state } = useStore();
  return useMemo(() => {
    const list = (state.projects ?? []).filter(p => p.status === "active" && !p.archivedAt);
    return list.map(p => {
      const tasks = state.tasks.filter(t => t.projectId === p.id && !t.parentTaskId);
      const done = tasks.filter(t => t.done).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      return { p, pct, total: tasks.length, done };
    }).sort((a, b) => b.pct - a.pct);
  }, [state.projects, state.tasks]);
}

function InProgressProjectsCard() {
  const rows = useProjectProgress().slice(0, 4);
  return (
    <Card>
      <CardHeader icon={<SparklesIcon className="h-4 w-4" />} title="In Progress" />
      {rows.length === 0 ? (
        <EmptyState text="No active projects." />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ p, pct }) => (
            <li key={p.id}>
              <div className="flex items-baseline justify-between gap-2">
                <Link to={`/projects/${p.id}`} className="min-w-0 truncate text-sm font-medium text-foreground hover:text-primary">
                  {p.name}
                </Link>
                <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <CardFooter>
        <FooterAction icon={<ArrowRight className="h-3.5 w-3.5" />} label="View All" to="/projects" />
      </CardFooter>
    </Card>
  );
}

/* =====================================================================
 * Current Project Focus
 * =================================================================== */
const FOCUS_KEY = "careflow:today:focus-project:v1";
function readFocusId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(FOCUS_KEY);
}
function writeFocusId(id: string | null) {
  try {
    if (id) localStorage.setItem(FOCUS_KEY, id);
    else localStorage.removeItem(FOCUS_KEY);
  } catch { /* noop */ }
}

function CurrentProjectFocusCard() {
  const { state, toggleTask } = useStore();
  const rows = useProjectProgress();
  const [focusId, setFocusId] = useState<string | null>(() => readFocusId());

  const focus = useMemo(() => {
    if (focusId) {
      const hit = rows.find(r => r.p.id === focusId);
      if (hit) return hit;
    }
    return rows.find(r => r.p.isFavorite) ?? rows[0] ?? null;
  }, [rows, focusId]);

  const openTasks = useMemo(() => {
    if (!focus) return [];
    return state.tasks
      .filter(t => t.projectId === focus.p.id && !t.done && !t.parentTaskId)
      .slice(0, 3);
  }, [focus, state.tasks]);

  const setFocus = (id: string) => {
    setFocusId(id);
    writeFocusId(id);
  };

  return (
    <Card>
      <CardHeader
        icon={<Target className="h-4 w-4" />}
        title="Project Focus"
        action={
          rows.length > 0 && focus ? (
            <Select value={focus.p.id} onValueChange={setFocus}>
              <SelectTrigger className="h-7 w-[150px] rounded-full border-border/50 bg-background/70 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {rows.map(r => (
                  <SelectItem key={r.p.id} value={r.p.id} className="text-xs">
                    <span className="mr-1">{r.p.icon ?? "✨"}</span>{r.p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />
      {!focus ? (
        <EmptyState text="Pick a favorite project to focus on." />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg"
              style={{
                background: `${focus.p.color ?? "hsl(var(--primary))"}22`,
                color: focus.p.color ?? "hsl(var(--primary))",
              }}
            >
              {focus.p.icon ?? "✨"}
            </div>
            <Link
              to={`/projects/${focus.p.id}`}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground hover:text-primary"
            >
              {focus.p.name}
            </Link>
            <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">
              {focus.pct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700"
              style={{ width: `${focus.pct}%` }}
            />
          </div>
          <div className="mt-4">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Next steps</div>
            {openTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/50 px-3 py-2 text-center text-[11px] text-muted-foreground">
                All caught up here.
              </p>
            ) : (
              <ul className="space-y-1">
                {openTasks.map(t => (
                  <li
                    key={t.id}
                    className="group flex items-start gap-2 rounded-lg px-1 py-1 transition hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={() => void toggleTask(t.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span className="min-w-0 flex-1 whitespace-normal break-words text-[13px] text-foreground/90">
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <CardFooter>
            <FooterAction
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              label="View Project"
              to={`/projects/${focus.p.id}`}
            />
          </CardFooter>
        </>
      )}
    </Card>
  );
}

/* =====================================================================
 * Habits + Routines mini card (near Today's schedule)
 * =================================================================== */
function HabitsRoutinesCard({ date }: { date: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const dow = date.getDay();
  const [open, setOpen] = useState(false);

  const todayHabits = useMemo(() => state.habits.filter(h => {
    if (h.cadence === "daily") return true;
    if (h.cadence === "weekly") {
      if (h.daysOfWeek?.length) return h.daysOfWeek.includes(dow);
      return true;
    }
    return (h.linkedTaskIds ?? []).some(id => {
      const t = state.tasks.find(x => x.id === id);
      return t?.dueDate === iso;
    });
  }), [state.habits, state.tasks, iso, dow]);

  const total = todayHabits.length;
  const done = todayHabits.filter(h => h.log[iso]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const routineTotal = (() => {
    try { return routinesApi.list().length; } catch { return 0; }
  })();

  return (
    <Card>
      <CardHeader
        icon={<Sprout className="h-4 w-4" />}
        title="Habits & Routines"
        action={
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary/80 transition hover:bg-primary/10 hover:text-primary"
          >
            {open ? "Hide" : "Show"}
            <ChevronRightIcon
              className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
            />
          </button>
        }
      />
      <div className="flex items-center gap-3">
        <Ring pct={pct} color="hsl(var(--primary))" size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">
            {done} of {total} habits tended
          </div>
          <div className="text-[11px] text-muted-foreground">
            {routineTotal
              ? `${routineTotal} routine${routineTotal === 1 ? "" : "s"} available · tap Show to run timer`
              : "Add a routine to run a guided timer"}
          </div>
        </div>
        <Link
          to="/routines"
          className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/15"
          title="Open routines with focus timer"
        >
          Timer
        </Link>
      </div>
      {open && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <TodayHabitsCard date={date} />
        </div>
      )}
    </Card>
  );
}