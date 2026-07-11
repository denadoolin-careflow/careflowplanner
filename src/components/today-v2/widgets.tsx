import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonPhase, getIllumination, MOON_INFO } from "@/lib/moon";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Sun, Moon, Sparkles, Heart, Home, Droplets, Footprints, NotebookPen,
  Utensils, CalendarClock, Plus, Star, HeartHandshake, Activity, Feather,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared card chrome                                                 */
/* ------------------------------------------------------------------ */

function Card({
  title,
  icon,
  action,
  children,
  className,
  tone = "cream",
}: {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "cream" | "sage" | "gold" | "clear";
}) {
  const toneCls =
    tone === "sage"
      ? "bg-gradient-to-br from-primary/8 to-secondary/10"
      : tone === "gold"
      ? "bg-gradient-to-br from-amber-100/40 to-primary/5 dark:from-amber-500/10 dark:to-primary/10"
      : tone === "clear"
      ? "bg-card/70"
      : "bg-card/85";
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-border/50 p-4 shadow-soft backdrop-blur-xl",
        toneCls,
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-primary">{icon}</span>}
            {title && (
              <h3 className="truncate font-display text-sm font-semibold text-foreground">
                {title}
              </h3>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* localStorage helpers                                               */
/* ------------------------------------------------------------------ */

function useLocal<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

const dayKey = () => format(new Date(), "yyyy-MM-dd");

/* ------------------------------------------------------------------ */
/* 1. Hero greeting                                                   */
/* ------------------------------------------------------------------ */

export function HeroGreetingWidget() {
  const { days } = useWeekForecast();
  const wx = days?.[0];
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return (
    <div
      className="relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-3xl border border-border/50 p-6 shadow-soft"
      style={{
        background:
          "linear-gradient(135deg, hsl(36 55% 96%) 0%, hsl(145 30% 90%) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: "hsl(145 40% 70%)" }}
      />
      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary/70">
          {format(now, "EEEE, MMMM d")}
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {greeting}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A gentle plan for a full day.
        </p>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-1">
          <Sun className="h-3.5 w-3.5 text-primary" /> {format(now, "h:mm a")}
        </span>
        {wx && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-1">
            {Math.round(wx.highC)}° · {wx.label}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Capacity check-in                                               */
/* ------------------------------------------------------------------ */

const CAPACITIES = [
  { key: "spacious", label: "Spacious", emoji: "🌤" },
  { key: "steady", label: "Steady", emoji: "🌿" },
  { key: "tender", label: "Tender", emoji: "🌸" },
  { key: "depleted", label: "Depleted", emoji: "🌙" },
] as const;

export function CapacityCheckInWidget() {
  const [state, setState] = useLocal(`careflow:capacity:${dayKey()}`, {
    capacity: "" as (typeof CAPACITIES)[number]["key"] | "",
    mvd: false,
  });
  return (
    <Card title="Capacity check-in" icon={<Heart className="h-4 w-4" />} tone="sage">
      <p className="mb-3 text-xs text-muted-foreground">How's your capacity today?</p>
      <div className="grid grid-cols-2 gap-2">
        {CAPACITIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setState({ ...state, capacity: c.key })}
            className={cn(
              "rounded-2xl border p-3 text-left text-sm transition-colors",
              state.capacity === c.key
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="text-lg leading-none">{c.emoji}</div>
            <div className="mt-1 font-medium">{c.label}</div>
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-3 py-2 text-sm">
        <span className="min-w-0">
          <span className="block font-medium text-foreground">Minimum Viable Day</span>
          <span className="block text-[11px] text-muted-foreground">Just the essentials.</span>
        </span>
        <input
          type="checkbox"
          checked={state.mvd}
          onChange={(e) => setState({ ...state, mvd: e.target.checked })}
          className="h-4 w-4 accent-primary"
        />
      </label>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Moon summary                                                    */
/* ------------------------------------------------------------------ */

export function MoonSummaryWidget() {
  const now = new Date();
  const phase = getMoonPhase(now);
  const illum = getIllumination(now);
  const info = MOON_INFO[phase];
  return (
    <Card title="Moon" icon={<Moon className="h-4 w-4" />} tone="cream">
      <div className="flex items-start gap-3">
        <div className="text-4xl leading-none">{info.glyph}</div>
        <div className="min-w-0">
          <div className="font-display text-base font-semibold text-foreground">
            {info.label}
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(illum * 100)}% illuminated
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {info.invitation}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {info.affirmation}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Daily debrief (heuristic)                                       */
/* ------------------------------------------------------------------ */

export function DailyDebriefWidget() {
  const { state } = useStore();
  const today = format(new Date(), "yyyy-MM-dd");
  const dueToday = state.tasks.filter((t) => t.dueDate === today && !t.done);
  const withRhythm = dueToday.slice(0, 3).map((t) => t.title);
  const reshape = dueToday.slice(3, 6).map((t) => t.title);
  return (
    <Card title="Daily debrief" icon={<Sparkles className="h-4 w-4" />} tone="cream">
      <p className="text-xs leading-relaxed text-muted-foreground">
        You have <b className="text-foreground">{dueToday.length}</b> tasks queued today.
        Move slowly — one gentle thing at a time.
      </p>
      <div className="mt-3 space-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary/80">With the rhythm</div>
          {withRhythm.length ? (
            <ul className="mt-1 space-y-1 text-xs text-foreground">
              {withRhythm.map((t, i) => (
                <li key={i} className="truncate">• {t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Nothing pressing.</p>
          )}
        </div>
        {reshape.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-700/80 dark:text-amber-400/80">
              Consider reshaping
            </div>
            <ul className="mt-1 space-y-1 text-xs text-foreground">
              {reshape.map((t, i) => (
                <li key={i} className="truncate">• {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Cycle summary                                                   */
/* ------------------------------------------------------------------ */

export function CycleSummaryWidget() {
  const { settings, periods } = useCycle();
  const cycle = useMemo(
    () => (settings.enabled ? getPhaseInfo(new Date(), periods, settings) : null),
    [settings, periods],
  );
  if (!cycle)
    return (
      <Card title="Cycle" icon={<Heart className="h-4 w-4" />} tone="cream">
        <p className="text-xs text-muted-foreground">
          Enable cycle tracking in Settings to see phase-aware guidance here.
        </p>
      </Card>
    );
  return (
    <Card title={`Cycle · ${cycle.phase}`} icon={<Heart className="h-4 w-4" />} tone="cream">
      <div className="text-xs text-muted-foreground">Day {cycle.cycleDay}</div>
      <p className="mt-2 text-xs leading-relaxed text-foreground">{cycle.affirmation}</p>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Energy: {cycle.energyFloor}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Timeline                                                        */
/* ------------------------------------------------------------------ */

export function TodaysTimelineWidget() {
  const { state } = useStore();
  const today = format(new Date(), "yyyy-MM-dd");
  const items = [
    ...state.appointments
      .filter((a) => a.date === today)
      .map((a) => ({ time: a.time ?? "—", title: a.title, id: a.id })),
    ...state.tasks
      .filter((t) => t.dueDate === today && t.startTime)
      .map((t) => ({ time: t.startTime!, title: t.title, id: t.id })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <Card title="Today's timeline" icon={<CalendarClock className="h-4 w-4" />} tone="cream">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No scheduled blocks yet.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-3">
              <span className="mt-0.5 w-12 shrink-0 text-[11px] font-medium text-primary">
                {it.time}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                {it.title}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Top priorities                                                  */
/* ------------------------------------------------------------------ */

export function TopPrioritiesWidget() {
  const { state, toggleTask } = useStore();
  const top = state.tasks.filter((t) => t.isTopThree && !t.done).slice(0, 5);
  return (
    <Card title="Top priorities" icon={<Star className="h-4 w-4" />} tone="gold">
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground">Star tasks to see them here.</p>
      ) : (
        <ul className="space-y-2">
          {top.map((t) => (
            <li key={t.id} className="flex items-start gap-2">
              <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} className="mt-0.5" />
              <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                {t.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Self-care check-in                                              */
/* ------------------------------------------------------------------ */

const SELFCARE = ["Body", "Mind", "Heart", "Energy", "Mood"] as const;

export function SelfCareCheckInWidget() {
  const [ratings, setRatings] = useLocal<Record<string, number>>(
    `careflow:selfcare:${dayKey()}`,
    {},
  );
  return (
    <Card title="Self-care check-in" icon={<HeartHandshake className="h-4 w-4" />} tone="sage">
      <ul className="space-y-2">
        {SELFCARE.map((row) => (
          <li key={row} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">{row}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${row} ${n}`}
                  onClick={() => setRatings({ ...ratings, [row]: n })}
                  className={cn(
                    "h-3 w-3 rounded-full border transition-colors",
                    (ratings[row] ?? 0) >= n
                      ? "border-primary bg-primary"
                      : "border-border bg-card",
                  )}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Tasks today (auto)                                              */
/* ------------------------------------------------------------------ */

export function TasksTodayV2Widget() {
  const { state, toggleTask, addTask } = useStore();
  const [draft, setDraft] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const tasks = state.tasks
    .filter((t) => t.dueDate === today)
    .sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  return (
    <Card
      title="Tasks today"
      icon={<Feather className="h-4 w-4" />}
      tone="cream"
      action={
        <Link to="/today" className="text-[11px] text-primary hover:underline">
          Open
        </Link>
      }
    >
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2">
            <Checkbox
              checked={t.done}
              onCheckedChange={() => toggleTask(t.id)}
              className="mt-0.5"
            />
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-sm",
                t.done ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {t.title}
            </span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          addTask({ title: draft.trim(), dueDate: today });
          setDraft("");
        }}
        className="mt-3 flex gap-1"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Today's flow (intentions)                                      */
/* ------------------------------------------------------------------ */

export function TodaysFlowWidget() {
  const [items, setItems] = useLocal<{ id: string; text: string; done: boolean }[]>(
    `careflow:flow:${dayKey()}`,
    [
      { id: "1", text: "Be present", done: false },
      { id: "2", text: "Stay flexible", done: false },
      { id: "3", text: "Rest without guilt", done: false },
    ],
  );
  const [draft, setDraft] = useState("");
  return (
    <Card title="Today's flow" icon={<Sparkles className="h-4 w-4" />} tone="sage">
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2">
            <Checkbox
              checked={it.done}
              onCheckedChange={() =>
                setItems(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
              }
              className="mt-0.5"
            />
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-sm",
                it.done ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {it.text}
            </span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          setItems([
            ...items,
            { id: crypto.randomUUID(), text: draft.trim(), done: false },
          ]);
          setDraft("");
        }}
        className="mt-3 flex gap-1"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add intention…"
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 11. HomeFlow                                                       */
/* ------------------------------------------------------------------ */

const HOMEFLOW_FILTERS = ["Today", "Overdue", "Weekly", "Monthly", "Seasonal"] as const;

export function HomeFlowWidget() {
  const [filter, setFilter] =
    useState<(typeof HOMEFLOW_FILTERS)[number]>("Today");
  const [items, setItems] = useLocal<{ id: string; text: string; done: boolean; room: string; mins: number }[]>(
    "careflow:homeflow",
    [
      { id: "1", text: "Wipe kitchen counters", done: false, room: "Kitchen", mins: 5 },
      { id: "2", text: "Laundry — fold + put away", done: false, room: "Laundry", mins: 20 },
      { id: "3", text: "Bathroom quick reset", done: true, room: "Bathroom", mins: 10 },
    ],
  );
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  return (
    <Card
      title="Home & Cleaning"
      icon={<Home className="h-4 w-4" />}
      tone="sage"
      action={
        <Link to="/home-reset" className="text-[11px] text-primary hover:underline">
          Home Reset
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1">
            {HOMEFLOW_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  filter === f
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-2 rounded-xl border border-border/50 bg-card/70 p-2"
              >
                <Checkbox
                  checked={it.done}
                  onCheckedChange={() =>
                    setItems(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
                  }
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "break-words text-sm",
                      it.done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {it.text}
                  </div>
                  <div className="mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
                    <span>{it.room}</span>
                    <span>· {it.mins} min</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/70 p-4 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15" className="fill-none stroke-border" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                className="fill-none stroke-primary transition-all"
                strokeWidth="3"
                strokeDasharray={`${(pct * 94.2) / 100} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute font-display text-lg font-semibold text-foreground">
              {pct}%
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Home reset progress</div>
          <div className="mt-3 rounded-xl bg-primary/10 px-2 py-1 text-[10px] text-primary">
            💡 Try a 10-min kitchen sweep next
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 12. My people                                                      */
/* ------------------------------------------------------------------ */

export function MyPeopleWidget() {
  const people = [
    { name: "Isaac", note: "school pickup 3pm" },
    { name: "Aerie", note: "vitamin at breakfast" },
    { name: "Nana", note: "call after dinner" },
  ];
  return (
    <Card title="My people" icon={<Heart className="h-4 w-4" />} tone="cream">
      <div className="grid gap-2 sm:grid-cols-3">
        {people.map((p) => (
          <div key={p.name} className="rounded-2xl border border-border/50 bg-card/70 p-3">
            <div className="font-display text-sm font-semibold text-foreground">{p.name}</div>
            <div className="mt-0.5 break-words text-[11px] text-muted-foreground">{p.note}</div>
            <div className="mt-2 flex gap-1">
              {["Note", "Med", "Appt"].map((a) => (
                <button
                  key={a}
                  className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-foreground hover:bg-primary/10"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 13. Care reminders                                                 */
/* ------------------------------------------------------------------ */

export function CareRemindersV2Widget() {
  const [items, setItems] = useLocal<{ id: string; text: string; done: boolean }[]>(
    `careflow:carerem:${dayKey()}`,
    [
      { id: "1", text: "Call pharmacy for refill", done: false },
      { id: "2", text: "Send Nana's photo update", done: false },
    ],
  );
  return (
    <Card title="Care reminders" icon={<HeartHandshake className="h-4 w-4" />} tone="sage">
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2">
            <Checkbox
              checked={it.done}
              onCheckedChange={() =>
                setItems(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
              }
              className="mt-0.5"
            />
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-sm",
                it.done ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {it.text}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 14. What's for dinner (compact)                                    */
/* ------------------------------------------------------------------ */

export function WhatsForDinnerV2Widget() {
  return (
    <Card
      title="Dinner"
      icon={<Utensils className="h-4 w-4" />}
      tone="gold"
      action={
        <Link to="/meals" className="text-[11px] text-primary hover:underline">
          Plan
        </Link>
      }
    >
      <div className="font-display text-base font-semibold text-foreground">
        Lemon herb chicken
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Rice · roasted carrots · lemon
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 15. Hydration                                                      */
/* ------------------------------------------------------------------ */

export function HydrationWidget() {
  const goal = 8;
  const [count, setCount] = useLocal(`careflow:hydration:${dayKey()}`, 0);
  return (
    <Card title="Hydration" icon={<Droplets className="h-4 w-4" />} tone="cream">
      <div className="font-display text-2xl font-semibold text-foreground">
        {count}/{goal}
      </div>
      <p className="text-[11px] text-muted-foreground">glasses today</p>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setCount(Math.max(0, count - 1))}>
          −
        </Button>
        <Button size="sm" className="h-7 px-2" onClick={() => setCount(count + 1)}>
          +1
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 16. Movement                                                       */
/* ------------------------------------------------------------------ */

export function MovementWidget() {
  const [state, setState] = useLocal(`careflow:movement:${dayKey()}`, {
    steps: 0,
    mins: 0,
  });
  return (
    <Card title="Movement" icon={<Footprints className="h-4 w-4" />} tone="sage">
      <div className="text-xs text-muted-foreground">Steps</div>
      <div className="font-display text-xl font-semibold text-foreground">
        {state.steps.toLocaleString()}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Active minutes</div>
      <div className="font-display text-xl font-semibold text-foreground">{state.mins}</div>
      <Button
        size="sm"
        variant="outline"
        className="mt-2 h-7 w-full"
        onClick={() => setState({ steps: state.steps + 1000, mins: state.mins + 10 })}
      >
        Log 10 min
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 17. Gratitude / notes                                              */
/* ------------------------------------------------------------------ */

export function GratitudeNotesWidget() {
  const [state, setState] = useLocal(`careflow:gratitude:${dayKey()}`, {
    gratitude: "",
    note: "",
  });
  return (
    <Card
      title="Gratitude"
      icon={<NotebookPen className="h-4 w-4" />}
      tone="gold"
      action={
        <Link to="/notes" className="text-[11px] text-primary hover:underline">
          Journal
        </Link>
      }
    >
      <textarea
        value={state.gratitude}
        onChange={(e) => setState({ ...state, gratitude: e.target.value })}
        placeholder="I'm grateful for…"
        className="h-14 w-full resize-none rounded-xl border border-border/50 bg-card/70 p-2 text-xs text-foreground placeholder:text-muted-foreground"
      />
      <textarea
        value={state.note}
        onChange={(e) => setState({ ...state, note: e.target.value })}
        placeholder="Quick note…"
        className="mt-2 h-12 w-full resize-none rounded-xl border border-border/50 bg-card/70 p-2 text-xs text-foreground placeholder:text-muted-foreground"
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 18. Affirmation footer                                             */
/* ------------------------------------------------------------------ */

export function AffirmationFooterWidget() {
  return (
    <div
      className="flex h-full items-center justify-center rounded-3xl border border-border/50 p-6 text-center shadow-soft"
      style={{
        background:
          "linear-gradient(135deg, hsl(145 30% 92%) 0%, hsl(36 45% 96%) 100%)",
      }}
    >
      <p className="font-display text-base italic text-foreground sm:text-lg">
        Breathe. You're doing better than you think.
      </p>
    </div>
  );
}