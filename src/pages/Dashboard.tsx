import { useMemo, useEffect, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { TaskRow } from "@/components/cards/TaskRow";
import { EnergyCheckIn } from "@/components/cards/EnergyCheckIn";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Cake, CalendarHeart, Coffee, Sparkles, Soup, HeartHandshake, Sparkle, Lightbulb, Flame, ListChecks, NotebookPen } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Link } from "react-router-dom";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MoonPhaseWidget } from "@/components/widgets/MoonPhaseWidget";
import { TaskProgressBar } from "@/components/cards/TaskProgressBar";
import { PomodoroPanel } from "@/components/tasks/PomodoroPanel";

const PROMPTS = [
  "What's one small thing already going right today?",
  "What can wait until tomorrow?",
  "Who is one person I want to be gentle with today — including me?",
  "What does a 'good enough' day look like?",
  "What is my body asking for right now?",
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "It's late, friend";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Soft night";
}

export default function Dashboard() {
  const { state, toggleCleaning, toggleHabit } = useStore();
  const T = todayISO();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const top3 = state.tasks.filter(t => t.isTopThree && !t.done).slice(0, 3);
  const apptsToday = state.appointments.filter(a => a.date === T).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const mealsToday = state.meals.filter(m => m.date === T);
  const familyTasks = state.tasks.filter(t => !t.done && (t.area === "Kids" || t.area === "Family")).slice(0, 4);
  const careTasks = state.tasks.filter(t => !t.done && t.area === "Caregiving").slice(0, 4);
  const reset = state.cleaning.filter(c => c.cadence === "weekly");
  const resetDone = reset.filter(c => c.done).length;

  const upcomingBdays = useMemo(() => state.birthdays
    .map(b => ({ ...b, days: differenceInCalendarDays(parseISO(b.date), new Date()) }))
    .filter(b => b.days >= 0 && b.days <= 60).sort((a, b) => a.days - b.days).slice(0, 3), [state.birthdays]);

  const upcomingHols = useMemo(() => state.holidays
    .map(h => ({ ...h, days: differenceInCalendarDays(parseISO(h.date), new Date()) }))
    .filter(h => h.days >= 0 && h.days <= 60).sort((a, b) => a.days - b.days).slice(0, 3), [state.holidays]);

  const habitToday = state.habits.filter(h => h.cadence === "daily").slice(0, 5);
  const habitsDone = habitToday.filter(h => h.log[T]).length;

  const goalsActive = state.goals.filter(g => g.status === "active").slice(0, 3);
  const ideas = state.ideas.slice(0, 4);
  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];

  const dayParts: ("Morning"|"Afternoon"|"Evening"|"Late Night")[] = ["Morning","Afternoon","Evening","Late Night"];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="cozy-card overflow-hidden">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8 gradient-warm">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
            <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{greeting()}, {state.settings.name}.</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">A soft start. One thing at a time. You don't have to do it all today.</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] uppercase tracking-[0.22em] text-accent-foreground/70">Today</span>
              <div className="font-display text-3xl font-semibold tabular-nums tracking-tight text-accent-foreground sm:text-4xl">
                {format(now, "h:mm")}<span className="text-accent-foreground/50">:{format(now, "ss")}</span>
                <span className="ml-1 text-sm font-medium text-accent-foreground/60">{format(now, "a")}</span>
              </div>
              <span className="mt-0.5 text-[11px] font-medium text-accent-foreground/70">
                {format(now, "EEE, MMM d")}
              </span>
            </div>
            <EnergyCheckIn />
            {state.settings.lowEnergyMode && (
              <Badge className="rounded-full bg-moon-soft text-moon-foreground hover:bg-moon-soft">Low-energy mode on</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><WeatherWidget /></div>
        <MoonPhaseWidget />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TaskProgressBar scope="today" />
        <PomodoroPanel />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Today's focus" subtitle="Your top three." accent="calm" action={<Link to="/today" className="text-xs text-primary hover:underline">Open today →</Link>}>
          {top3.length === 0
            ? <p className="text-sm text-muted-foreground">No top three set yet. Choose three small things.</p>
            : <div className="space-y-1">{top3.map(t => <TaskRow key={t.id} task={t} dense showArea={false} />)}</div>}
        </SectionCard>

        <SectionCard title="Daily rhythm" subtitle="Morning → late night." accent="warm">
          <div className="space-y-3">
            {dayParts.map(part => {
              const items = state.tasks.filter(t => !t.done && t.dayPart === part);
              return (
                <div key={part}>
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Coffee className="h-3 w-3" /> {part}
                  </div>
                  {items.length === 0 ? <p className="pl-5 text-xs text-muted-foreground">— open —</p>
                    : <div className="space-y-0.5">{items.slice(0,2).map(t => <TaskRow key={t.id} task={t} dense showArea={false} />)}</div>}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Appointments today" accent="sage" action={<Link to="/calendar" className="text-xs text-primary hover:underline">Calendar →</Link>}>
          {apptsToday.length === 0
            ? <p className="text-sm text-muted-foreground">A clear day. Enjoy it.</p>
            : <ul className="space-y-2">
              {apptsToday.map(a => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary-foreground">
                    <CalendarHeart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.time ?? "any time"} {a.with ? `· ${a.with}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>}
        </SectionCard>

        <SectionCard title="Meals today" accent="warm" action={<Link to="/meals" className="text-xs text-primary hover:underline">Plan week →</Link>}>
          {mealsToday.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing planned. Cereal counts.</p>
            : <ul className="space-y-2">
              {mealsToday.map(m => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
                  <Soup className="h-4 w-4 text-accent-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.slot}{m.kidSafe ? " · kid-safe" : ""}</p>
                  </div>
                </li>
              ))}
            </ul>}
        </SectionCard>

        <SectionCard title="Caregiving check-ins" accent="calm" action={<Link to="/caregiving" className="text-xs text-primary hover:underline">Care hub →</Link>}>
          <div className="space-y-1.5">
            {state.recipients.slice(0,3).map(r => {
              const recent = state.careNotes.find(n => n.recipientId === r.id);
              return (
                <div key={r.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-foreground">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{recent?.body ?? "No recent notes."}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Family / kids tasks" accent="warm">
          {familyTasks.length === 0
            ? <p className="text-sm text-muted-foreground">All caught up.</p>
            : <div className="space-y-1">{familyTasks.map(t => <TaskRow key={t.id} task={t} dense showArea={false} />)}</div>}
        </SectionCard>

        <SectionCard title="Home reset progress" accent="sage" action={<Link to="/home-reset" className="text-xs text-primary hover:underline">Open →</Link>}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{resetDone} of {reset.length} this week</span>
            <Sparkle className="h-4 w-4 text-secondary-foreground" />
          </div>
          <Progress value={reset.length ? (resetDone / reset.length) * 100 : 0} className="h-2" />
          <ul className="mt-3 space-y-1">
            {reset.slice(0, 4).map(c => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={c.done} onChange={() => toggleCleaning(c.id)} className="h-4 w-4 rounded accent-primary" />
                <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.title}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Habit snapshot" accent="calm" action={<Link to="/habits" className="text-xs text-primary hover:underline">All habits →</Link>}>
          <div className="mb-3 text-sm text-muted-foreground">{habitsDone} of {habitToday.length} done today</div>
          <ul className="space-y-1.5">
            {habitToday.map(h => (
              <li key={h.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!h.log[T]} onChange={() => toggleHabit(h.id)} className="h-4 w-4 rounded accent-primary" />
                  {h.title}
                </label>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="h-3 w-3" /> {h.streak}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Upcoming birthdays" accent="warm">
          {upcomingBdays.length === 0
            ? <p className="text-sm text-muted-foreground">No birthdays coming up.</p>
            : <ul className="space-y-2">
              {upcomingBdays.map(b => (
                <li key={b.id} className="flex items-center gap-3 rounded-xl bg-accent-soft px-3 py-2 text-accent-foreground">
                  <Cake className="h-4 w-4" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs opacity-80">{format(parseISO(b.date), "MMM d")} · in {b.days} {b.days === 1 ? "day" : "days"}</p>
                  </div>
                </li>
              ))}
            </ul>}
        </SectionCard>

        <SectionCard title="Upcoming holidays" accent="sage">
          {upcomingHols.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing on the horizon.</p>
            : <ul className="space-y-2">
              {upcomingHols.map(h => (
                <li key={h.id} className="flex items-center gap-3 rounded-xl bg-secondary-soft px-3 py-2 text-secondary-foreground">
                  <Sparkles className="h-4 w-4" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs opacity-80">{format(parseISO(h.date), "MMM d")} · in {h.days} days</p>
                  </div>
                </li>
              ))}
            </ul>}
        </SectionCard>

        <SectionCard title="Weekly reset checklist" accent="calm" action={<Link to="/week" className="text-xs text-primary hover:underline">Week view →</Link>}>
          <ul className="space-y-1">
            {(state.resetTemplates[0]?.items ?? []).slice(0, 6).map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-sm"><ListChecks className="h-3.5 w-3.5 text-muted-foreground" />{it}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="This month's goals" accent="warm" action={<Link to="/goals" className="text-xs text-primary hover:underline">Goals →</Link>}>
          <div className="space-y-3">
            {goalsActive.map(g => (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-xs text-muted-foreground">{g.progress}%</span>
                </div>
                <Progress value={g.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Idea inbox" accent="sage" action={<Link to="/ideas" className="text-xs text-primary hover:underline">All ideas →</Link>}>
          {ideas.length === 0
            ? <p className="text-sm text-muted-foreground">Empty inbox. Noted.</p>
            : <ul className="space-y-1.5">
              {ideas.map(i => (
                <li key={i.id} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 text-accent-foreground" />
                  <span>{i.title}</span>
                </li>
              ))}
            </ul>}
        </SectionCard>

        <SectionCard title="Journal prompt" subtitle="Just one line if that's what you have." accent="warm" action={<Link to="/journal" className="text-xs text-primary hover:underline">Journal →</Link>}>
          <div className="rounded-xl bg-gradient-to-br from-accent-soft to-primary-soft p-4">
            <NotebookPen className="mb-2 h-4 w-4 text-foreground/70" />
            <p className="font-display text-base">{prompt}</p>
          </div>
        </SectionCard>

        <SectionCard title="A soft moment" accent="calm">
          <p className="font-display text-base leading-relaxed text-foreground/80">
            "You are not behind. You are exactly here, doing one thing at a time, holding more than anyone sees."
          </p>
          <Link to="/today"><Button variant="secondary" className="mt-4 rounded-full">Open today's plan</Button></Link>
        </SectionCard>
      </div>
    </div>
  );
}
