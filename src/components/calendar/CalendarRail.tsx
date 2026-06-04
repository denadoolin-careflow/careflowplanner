import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, differenceInCalendarDays, format, parseISO, setYear, isAfter, isBefore } from "date-fns";
import { useStore, todayISO } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Target, Sparkles, Cake, PartyPopper, Compass, Home, Heart, DollarSign,
  Palette, Users, Plus, ArrowRight, CalendarClock, Sprout,
} from "lucide-react";
import { useFlowAccent } from "@/lib/flow-accent";
import { useAtmosphere } from "@/lib/atmospheres";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";

/* ============================== Shell ============================== */

export function CalendarRail() {
  return (
    <>
      {/* Mobile / tablet swipeable deck above the calendar */}
      <div className="-mx-4 mb-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 xl:hidden">
        <Swipe><GoalsThisMonthCard /></Swipe>
        <Swipe><IntentionCard /></Swipe>
        <Swipe><AreasToGrowCard /></Swipe>
        <Swipe><UpcomingBirthdaysCard /></Swipe>
        <Swipe><CelebrationsCard /></Swipe>
        <Swipe><UpcomingHighlightsCard /></Swipe>
      </div>

      {/* Desktop right rail */}
      <aside className="hidden w-[300px] shrink-0 space-y-4 xl:block">
        <GoalsThisMonthCard />
        <IntentionCard />
        <AreasToGrowCard />
        <UpcomingBirthdaysCard />
        <CelebrationsCard />
        <UpcomingHighlightsCard />
        <UnscheduledTasksRail />
      </aside>
    </>
  );
}

function Swipe({ children }: { children: React.ReactNode }) {
  return <div className="min-w-[85%] snap-start">{children}</div>;
}

/* ============================== Goals This Month ============================== */

function GoalsThisMonthCard() {
  const { state } = useStore();
  const navigate = useNavigate();
  const goals = (state.goals ?? [])
    .filter((g: Goal) => g.status === "active")
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 5);
  return (
    <Section
      title="Goals This Month"
      onAll={() => navigate("/goals")}
      icon={Target}
    >
      {goals.length === 0 ? (
        <Empty text="No active goals — pick one to grow this season." />
      ) : (
        <ul className="space-y-2.5">
          {goals.map(g => (
            <li key={g.id}>
              <button
                onClick={() => navigate("/goals")}
                className="block w-full rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-base">{goalEmoji(g.category)}</span>
                    <span className="truncate text-sm font-medium">{g.title}</span>
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(g.progress ?? 0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-emerald-500/80 transition-all"
                    style={{ width: `${Math.max(2, g.progress ?? 0)}%` }}
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        onClick={() => navigate("/goals")}
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-center rounded-xl text-xs"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add goal
      </Button>
    </Section>
  );
}

function goalEmoji(cat?: string): string {
  switch (cat) {
    case "Family": return "👨‍👩‍👧";
    case "Home": return "🏡";
    case "Health": return "❤️";
    case "Creative": return "🎨";
    case "Financial": return "💰";
    case "Relationship": return "💛";
    case "Caregiving": return "🤲";
    default: return "🌱";
  }
}

/* ============================== Intention ============================== */

type Intention = { word: string; sentence: string; updatedAt: string };
const INTENTION_KEY = "careflow:calendar:intention";

function loadIntention(): Intention {
  try {
    const raw = localStorage.getItem(INTENTION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return { word: "Peace", sentence: "Choose peace over perfect.", updatedAt: new Date().toISOString() };
}

function IntentionCard() {
  const accent = useFlowAccent("planflow");
  const [intention, setIntention] = useState<Intention>(() => loadIntention());
  const [editing, setEditing] = useState(false);
  const [draftWord, setDraftWord] = useState(intention.word);
  const [draftSentence, setDraftSentence] = useState(intention.sentence);

  const save = () => {
    const next: Intention = { word: draftWord.trim() || "Peace", sentence: draftSentence.trim() || "Choose peace over perfect.", updatedAt: new Date().toISOString() };
    setIntention(next);
    localStorage.setItem(INTENTION_KEY, JSON.stringify(next));
    setEditing(false);
  };

  return (
    <Section title="Current Intention" icon={Sparkles}>
      <div
        className="relative overflow-hidden rounded-2xl border border-border/40 p-4"
        style={{ background: `linear-gradient(135deg, ${accent.gradient}, ${accent.soft} 60%, transparent)` }}
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">This month</div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <input
              value={draftWord}
              onChange={(e) => setDraftWord(e.target.value)}
              placeholder="One word"
              className="w-full rounded-lg border border-border/60 bg-background/70 px-2 py-1 text-sm"
            />
            <textarea
              value={draftSentence}
              onChange={(e) => setDraftSentence(e.target.value)}
              placeholder="A short sentence to live by"
              rows={2}
              className="w-full resize-none rounded-lg border border-border/60 bg-background/70 px-2 py-1 text-sm"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-1 font-display text-2xl leading-tight">{intention.word}</div>
            <p className="mt-1 text-sm italic text-foreground/80">"{intention.sentence}"</p>
            <button
              onClick={() => { setDraftWord(intention.word); setDraftSentence(intention.sentence); setEditing(true); }}
              className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Edit intention
            </button>
          </>
        )}
      </div>
    </Section>
  );
}

/* ============================== Areas to Grow ============================== */

const AREA_TILES: { label: string; icon: any; tint: string; path: string }[] = [
  { label: "Home",      icon: Home,        tint: "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200", path: "/areas" },
  { label: "Health",    icon: Heart,       tint: "bg-rose-100/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",            path: "/health" },
  { label: "Finances",  icon: DollarSign,  tint: "bg-amber-100/70 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",        path: "/wealth" },
  { label: "Creative",  icon: Palette,     tint: "bg-violet-100/70 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200",    path: "/projects" },
  { label: "Family",    icon: Users,       tint: "bg-sky-100/70 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",                path: "/family-settings" },
];

function AreasToGrowCard() {
  const navigate = useNavigate();
  return (
    <Section title="Areas to Grow" icon={Compass} onAll={() => navigate("/areas")}>
      <div className="grid grid-cols-5 gap-1.5">
        {AREA_TILES.map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors hover:bg-muted/40"
          >
            <span className={cn("grid h-9 w-9 place-items-center rounded-full", a.tint)}>
              <a.icon className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-muted-foreground">{a.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

/* ============================== Birthdays ============================== */

function nextBirthdayDate(iso: string): Date {
  const d = parseISO(iso);
  const now = new Date();
  const candidate = setYear(d, now.getFullYear());
  if (isBefore(candidate, new Date(now.getFullYear(), now.getMonth(), now.getDate()))) {
    return setYear(d, now.getFullYear() + 1);
  }
  return candidate;
}

function UpcomingBirthdaysCard() {
  const { state } = useStore();
  const items = useMemo(() => {
    return (state.birthdays ?? [])
      .map(b => ({ ...b, next: nextBirthdayDate(b.date) }))
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 3);
  }, [state.birthdays]);
  return (
    <Section title="Upcoming Birthdays" icon={Cake}>
      {items.length === 0 ? (
        <Empty text="No birthdays saved yet." />
      ) : (
        <ul className="space-y-2">
          {items.map(b => {
            const days = differenceInCalendarDays(b.next, new Date());
            const initial = (b.name || "?").trim().charAt(0).toUpperCase();
            return (
              <li key={b.id} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-100/70 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {days === 0 ? "Today 🎂" : days === 1 ? "Tomorrow" : `in ${days} days`} · {format(b.next, "MMM d")}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ============================== Celebrations & Events ============================== */

function CelebrationsCard() {
  const { state } = useStore();
  const today = todayISO();
  const horizon = format(addDays(new Date(), 60), "yyyy-MM-dd");

  const items = useMemo(() => {
    const out: { id: string; label: string; date: string; kind: "holiday" | "event" | "trip" }[] = [];
    for (const h of state.holidays ?? []) {
      if (h.date >= today && h.date <= horizon) {
        out.push({ id: `h-${h.id}`, label: h.name, date: h.date, kind: "holiday" });
      }
    }
    for (const a of state.appointments ?? []) {
      const tag = (a.type || "").toLowerCase();
      if (a.date >= today && a.date <= horizon && /(event|celebration|party|trip)/.test(tag)) {
        out.push({ id: `a-${a.id}`, label: a.title, date: a.date, kind: tag.includes("trip") ? "trip" : "event" });
      }
    }
    return out.sort((x, y) => x.date.localeCompare(y.date)).slice(0, 4);
  }, [state.holidays, state.appointments, today, horizon]);

  return (
    <Section title="Celebrations & Events" icon={PartyPopper}>
      {items.length === 0 ? (
        <Empty text="No celebrations in the next 60 days." />
      ) : (
        <ul className="space-y-2">
          {items.map(it => {
            const d = parseISO(it.date);
            const emoji = it.kind === "holiday" ? "🎉" : it.kind === "trip" ? "🏕" : "❤️";
            return (
              <li key={it.id} className="flex items-center gap-3">
                <span className="text-lg">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.label}</div>
                  <div className="text-[11px] text-muted-foreground">{format(d, "EEE · MMM d")}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ============================== Highlights ============================== */

function UpcomingHighlightsCard() {
  const { state } = useStore();
  const today = todayISO();

  const nextAppt = useMemo(
    () => (state.appointments ?? [])
      .filter(a => a.date >= today)
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0],
    [state.appointments, today]
  );
  const nextBday = useMemo(() => {
    const list = (state.birthdays ?? [])
      .map(b => ({ ...b, next: nextBirthdayDate(b.date) }))
      .sort((a, b) => a.next.getTime() - b.next.getTime());
    return list[0];
  }, [state.birthdays]);
  const nextTask = useMemo(
    () => (state.tasks ?? [])
      .filter(t => !t.done && !t.parentTaskId && t.dueDate && t.dueDate >= today && t.priority === "high")
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0],
    [state.tasks, today]
  );

  const rows: { icon: any; label: string; sub: string }[] = [];
  if (nextAppt) rows.push({ icon: CalendarClock, label: nextAppt.title, sub: `${format(parseISO(nextAppt.date), "EEE MMM d")}${nextAppt.time ? ` · ${nextAppt.time}` : ""}` });
  if (nextBday) rows.push({ icon: Cake, label: `${nextBday.name}'s birthday`, sub: format(nextBday.next, "EEE MMM d") });
  if (nextTask) rows.push({ icon: Sprout, label: nextTask.title, sub: nextTask.dueDate ? format(parseISO(nextTask.dueDate), "EEE MMM d") : "" });

  return (
    <Section title="Upcoming Highlights" icon={ArrowRight}>
      {rows.length === 0 ? (
        <Empty text="A quiet horizon. Leave room for life." />
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                <r.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{r.label}</div>
                <div className="text-[11px] text-muted-foreground">{r.sub}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ============================== Shared bits ============================== */

function Section({
  title, icon: Icon, onAll, children,
}: {
  title: string;
  icon: any;
  onAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/50 bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-base">{title}</h3>
        </div>
        {onAll && (
          <button onClick={onAll} className="text-[11px] text-primary hover:underline">
            View all
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

/* ============================== Hero atmosphere chip (helper export) ============================== */

export function AtmosphereChip() {
  const { atmosphere } = useAtmosphere();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-1 text-[11px]"
      title={atmosphere.tagline}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: atmosphere.palette?.[0] ?? "currentColor" }}
      />
      🪐 {atmosphere.name}
    </span>
  );
}