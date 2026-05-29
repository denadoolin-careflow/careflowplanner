import { useEffect, useMemo, useState } from "react";
import { addDays, endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, Target, Compass, Cake, PartyPopper, Receipt, Briefcase,
  NotebookPen, Plus, X, Activity, Repeat, Utensils, ShoppingCart, Sparkle,
  HeartHandshake, Sun, Sunset, Moon, ArrowRight, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useCheckins } from "@/lib/checkins";
import { buildCheckinAppointments } from "@/lib/checkin-calendar";
import { InboxCapture } from "@/components/calendar/InboxCapture";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Accent = "calm" | "warm" | "sage" | "rose";

function PlanCard({
  title, icon: Icon, accent = "calm", action, children, className,
}: {
  title: string; icon: any; accent?: Accent;
  action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  const stripe =
    accent === "calm" ? "from-primary/30 to-primary/0"
    : accent === "warm" ? "from-accent/40 to-accent/0"
    : accent === "sage" ? "from-secondary/40 to-secondary/0"
    : "from-rose-300/40 to-rose-200/0";
  const iconBg =
    accent === "calm" ? "bg-primary/10 text-primary"
    : accent === "warm" ? "bg-accent/30 text-accent-foreground"
    : accent === "sage" ? "bg-secondary/30 text-secondary-foreground"
    : "bg-rose-100 text-rose-700";
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={cn("cozy-card cozy-card-hover relative overflow-hidden", className)}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b", stripe)} />
      <header className="relative flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
        </div>
        {action}
      </header>
      <div className="relative px-5 pb-5 pt-3 text-sm">{children}</div>
    </motion.section>
  );
}

function ChipList({ items, onRemove }: { items: string[]; onRemove?: (i: number) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">None yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence>
        {items.map((s, i) => (
          <motion.span key={`${s}-${i}`}
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
            className="group inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {s}
            {onRemove && (
              <button onClick={() => onRemove(i)} className="opacity-50 hover:opacity-100"><X className="h-3 w-3" /></button>
            )}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AddInline({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (!t) return; onAdd(t); setV(""); }} className="mt-2 flex gap-1.5">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
      <Button type="submit" size="sm" variant="ghost" className="h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
    </form>
  );
}

function recurringFallsThisWeek(dateISO: string | null, weekStart: Date, weekEnd: Date): boolean {
  if (!dateISO) return false;
  const d = parseISO(dateISO);
  const year = weekStart.getFullYear();
  const candidates = [new Date(year, d.getMonth(), d.getDate()), new Date(year + 1, d.getMonth(), d.getDate())];
  return candidates.some(c => c >= weekStart && c <= weekEnd);
}

export function WeekPlanningDashboard({
  weekStart, onJumpToDay,
}: { weekStart: Date; onJumpToDay?: (d: Date) => void }) {
  const { state, updateTask, toggleHabit } = useStore();
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const sunday = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekLabel = `${format(monday, "MMM d")} – ${format(sunday, "MMM d")}`;
  const { intention, review, saveIntention, saveReview, weekISO, weekEndISO } = useWeeklyPlan(monday);

  // Local mirrors (save on blur)
  const [word, setWord] = useState(intention.word ?? "");
  const [theme, setTheme] = useState(intention.theme ?? "");
  const [intentionText, setIntentionText] = useState(intention.intention ?? "");
  const [emotionalFocus, setEmotionalFocus] = useState(intention.emotional_focus ?? "");
  const [notes, setNotes] = useState(intention.notes ?? "");
  useEffect(() => { setWord(intention.word ?? ""); }, [intention.word]);
  useEffect(() => { setTheme(intention.theme ?? ""); }, [intention.theme]);
  useEffect(() => { setIntentionText(intention.intention ?? ""); }, [intention.intention]);
  useEffect(() => { setEmotionalFocus(intention.emotional_focus ?? ""); }, [intention.emotional_focus]);
  useEffect(() => { setNotes(intention.notes ?? ""); }, [intention.notes]);

  // Derived week slices
  const weekTasks = useMemo(
    () => state.tasks.filter(t => t.dueDate && isWithinInterval(parseISO(t.dueDate), { start: monday, end: sunday })),
    [state.tasks, monday, sunday],
  );
  const completed = weekTasks.filter(t => t.done).length;
  const completionPct = weekTasks.length ? Math.round((completed / weekTasks.length) * 100) : 0;

  const checkins = useCheckins();
  const checkinEvents = useMemo(
    () => buildCheckinAppointments(checkins, state.recipients ?? [], monday, 14),
    [checkins, state.recipients, monday],
  );
  const weekAppointments = useMemo(
    () => [...state.appointments, ...checkinEvents].filter(a =>
      isWithinInterval(parseISO(a.date), { start: monday, end: sunday })
    ),
    [state.appointments, checkinEvents, monday, sunday],
  );
  const weekBirthdays = state.birthdays.filter(b => recurringFallsThisWeek(b.date, monday, sunday));
  const weekHolidays = state.holidays.filter(h => recurringFallsThisWeek(h.date, monday, sunday));
  const weekMeals = state.meals.filter(m => isWithinInterval(parseISO(m.date), { start: monday, end: sunday }));
  const projectTasks = weekTasks.filter(t => (t as any).projectId);
  const caregivingTasks = weekTasks.filter(t => t.area === "Caregiving" || t.recipientId);
  const cleaningThisWeek = (state.cleaning ?? []).filter(c => c.cadence === "weekly" || c.cadence === "daily");
  const cleaningDone = cleaningThisWeek.filter(c => c.done).length;
  const dailyHabits = (state.habits ?? []).filter(h => h.cadence === "daily");

  // Bills due this week
  const [bills, setBills] = useState<{ id: string; name: string; amount: number; next_due_date: string | null }[]>([]);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("recurring_bills")
        .select("id,name,amount,next_due_date")
        .eq("user_id", uid)
        .gte("next_due_date", weekISO)
        .lte("next_due_date", weekEndISO);
      setBills((data ?? []).map(b => ({ ...b, amount: Number(b.amount) })));
    })();
  }, [weekISO, weekEndISO]);

  // Carry-over from last week
  const carryOverCandidates = useMemo(() => {
    const lastStart = addDays(monday, -7);
    const lastEnd = addDays(monday, -1);
    return state.tasks.filter(t => !t.done && t.dueDate && isWithinInterval(parseISO(t.dueDate), { start: lastStart, end: lastEnd }));
  }, [state.tasks, monday]);

  const doCarryOver = async () => {
    if (!carryOverCandidates.length) { toast("Nothing to carry over."); return; }
    const target = format(monday, "yyyy-MM-dd");
    await Promise.all(carryOverCandidates.map(t => updateTask(t.id, { dueDate: target })));
    toast(`Carried over ${carryOverCandidates.length} task${carryOverCandidates.length === 1 ? "" : "s"} into this week`);
  };

  const planMyWeek = async () => {
    // Pulls top three from active goals + weekly priorities
    const goalTitles = state.goals.filter(g => g.status === "active").slice(0, 3).map(g => g.title);
    const next = [
      ...intention.top_three,
      ...goalTitles.filter(t => !intention.top_three.includes(t)),
    ].slice(0, 3);
    await saveIntention({ top_three: next });
    toast("Pulled top 3 from your active goals");
  };

  // Intention helpers
  const addPriority = (p: string) => saveIntention({ priorities: [...intention.priorities, p].slice(0, 7) });
  const removePriority = (i: number) => saveIntention({ priorities: intention.priorities.filter((_, idx) => idx !== i) });
  const addTop3 = (p: string) => saveIntention({ top_three: [...intention.top_three, p].slice(0, 3) });
  const removeTop3 = (i: number) => saveIntention({ top_three: intention.top_three.filter((_, idx) => idx !== i) });

  const reflectionPrompts = [
    "Where did you spend your best energy?",
    "What support do you need this week?",
    "What's one thing you can soften this week?",
    "Who deserves a small kindness?",
  ];

  // Day part helpers
  const partFor = (d: Date, part: "Morning" | "Afternoon" | "Evening") =>
    weekTasks.filter(t => t.dueDate === format(d, "yyyy-MM-dd") && t.dayPart === part);

  return (
    <div className="space-y-5">
      {/* QUICK CAPTURE */}
      <InboxCapture defaultDate={monday} />

      {/* HERO */}
      <PlanCard title={`Intention for ${weekLabel}`} icon={Sparkles} accent="warm" className="overflow-visible">
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Word of the week</label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onBlur={() => { if (word !== (intention.word ?? "")) saveIntention({ word }); }}
              placeholder="e.g. Steady"
              className="h-14 border-0 bg-gradient-to-br from-accent/20 to-primary/10 text-center font-display text-3xl font-semibold tracking-tight"
            />
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme</label>
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                onBlur={() => { if (theme !== (intention.theme ?? "")) saveIntention({ theme }); }}
                placeholder="e.g. Gentle reset"
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Emotional focus</label>
              <Input
                value={emotionalFocus}
                onChange={(e) => setEmotionalFocus(e.target.value)}
                onBlur={() => { if (emotionalFocus !== (intention.emotional_focus ?? "")) saveIntention({ emotional_focus: emotionalFocus }); }}
                placeholder="How do you want to feel?"
                className="mt-1"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Intention</label>
              <Textarea
                value={intentionText}
                onChange={(e) => setIntentionText(e.target.value)}
                onBlur={() => { if (intentionText !== (intention.intention ?? "")) saveIntention({ intention: intentionText }); }}
                placeholder="What do you want this week to feel like?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => { if (notes !== (intention.notes ?? "")) saveIntention({ notes }); }}
                placeholder="Anything to remember…"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </PlanCard>

      {/* TOP 3 + PRIORITIES + PROGRESS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PlanCard
          title="Top 3 this week"
          icon={Star}
          accent="warm"
          action={
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={planMyWeek}>
              <Sparkle className="mr-1 h-3 w-3" /> Plan my week
            </Button>
          }
        >
          <ChipList items={intention.top_three} onRemove={removeTop3} />
          <AddInline onAdd={addTop3} placeholder="Pick a high-leverage focus…" />
        </PlanCard>

        <PlanCard title="Priorities" icon={Compass} accent="sage">
          <ChipList items={intention.priorities} onRemove={removePriority} />
          <AddInline onAdd={addPriority} placeholder="Add a priority…" />
        </PlanCard>

        <PlanCard title="Week progress" icon={Activity} accent="calm">
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Tasks completed</span>
                <span className="font-display text-2xl font-semibold">
                  {completed}<span className="text-sm text-muted-foreground"> / {weekTasks.length}</span>
                </span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Appts" value={weekAppointments.length} />
              <Stat label="Meals" value={weekMeals.length} />
              <Stat label="Habits" value={dailyHabits.length} />
            </div>
            {carryOverCandidates.length > 0 && (
              <Button variant="outline" size="sm" className="w-full" onClick={doCarryOver}>
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                Carry over {carryOverCandidates.length} from last week
              </Button>
            )}
          </div>
        </PlanCard>
      </div>

      {/* DAY-BY-DAY OVERVIEW */}
      <PlanCard title="Day by day" icon={Sun} accent="calm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {days.map(d => {
            const iso = format(d, "yyyy-MM-dd");
            const appts = weekAppointments.filter(a => a.date === iso);
            const morning = partFor(d, "Morning");
            const afternoon = partFor(d, "Afternoon");
            const evening = partFor(d, "Evening");
            return (
              <button
                key={iso}
                onClick={() => onJumpToDay?.(d)}
                className="group rounded-xl border border-border/60 bg-background/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEEE")}</div>
                    <div className="font-display text-lg font-semibold leading-tight">{format(d, "MMM d")}</div>
                  </div>
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {morning.length + afternoon.length + evening.length + appts.length}
                  </span>
                </div>
                <DayPartRow icon={Sun} label="AM" items={morning.map(t => t.title)} extras={appts.filter(a => (a.time ?? "") < "12:00").map(a => a.title)} />
                <DayPartRow icon={Sunset} label="PM" items={afternoon.map(t => t.title)} extras={appts.filter(a => (a.time ?? "") >= "12:00" && (a.time ?? "") < "18:00").map(a => a.title)} />
                <DayPartRow icon={Moon} label="Eve" items={evening.map(t => t.title)} extras={appts.filter(a => (a.time ?? "") >= "18:00").map(a => a.title)} />
              </button>
            );
          })}
        </div>
      </PlanCard>

      {/* GRID OF DOMAIN CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PlanCard title="Weekly goals" icon={Target} accent="calm">
          {state.goals.filter(g => g.status === "active").length === 0 ? (
            <p className="text-xs text-muted-foreground">No active goals.</p>
          ) : (
            <ul className="space-y-2">
              {state.goals.filter(g => g.status === "active").slice(0, 5).map(g => (
                <li key={g.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{g.title}</span>
                    <span className="text-xs font-medium text-muted-foreground">{g.progress}%</span>
                  </div>
                  <Progress value={g.progress} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Project tasks" icon={Briefcase} accent="warm">
          {projectTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No project tasks scheduled.</p>
          ) : (
            <ul className="space-y-1.5">
              {projectTasks.slice(0, 6).map(t => {
                const proj = (state.projects ?? []).find(p => p.id === (t as any).projectId);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", t.done ? "bg-secondary" : "bg-primary")} />
                      <span className="truncate">{t.title}</span>
                    </span>
                    {proj && <span className="text-xs text-muted-foreground">{proj.icon ?? ""} {proj.name}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Habits" icon={Repeat} accent="sage">
          {dailyHabits.length === 0 ? (
            <p className="text-xs text-muted-foreground">No daily habits yet.</p>
          ) : (
            <ul className="space-y-1">
              {dailyHabits.slice(0, 6).map(h => {
                const doneCount = days.filter(d => h.log[format(d, "yyyy-MM-dd")]).length;
                return (
                  <li key={h.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{h.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{doneCount}/7</span>
                    </div>
                    <div className="flex gap-1">
                      {days.map(d => {
                        const iso = format(d, "yyyy-MM-dd");
                        const done = !!h.log[iso];
                        return (
                          <button
                            key={iso}
                            onClick={() => toggleHabit(h.id, iso)}
                            className={cn(
                              "h-5 flex-1 rounded-full transition-colors",
                              done ? "bg-secondary" : "bg-muted hover:bg-muted/80",
                            )}
                            aria-label={`Toggle ${h.title} on ${format(d, "EEE")}`}
                          />
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Meal plan" icon={Utensils} accent="warm">
          {weekMeals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No meals planned. Visit the Meals page to plan.</p>
          ) : (
            <ul className="space-y-1.5">
              {days.map(d => {
                const iso = format(d, "yyyy-MM-dd");
                const meals = weekMeals.filter(m => m.date === iso);
                if (!meals.length) return null;
                return (
                  <li key={iso} className="flex items-baseline gap-2 text-sm">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{format(d, "EEE")}</span>
                    <span className="truncate">{meals.map(m => m.name).join(" · ")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Grocery" icon={ShoppingCart} accent="sage">
          <GroceryMini />
        </PlanCard>

        <PlanCard title="Cleaning" icon={Sparkle} accent="calm">
          {cleaningThisWeek.length === 0 ? (
            <p className="text-xs text-muted-foreground">No cleaning tasks set.</p>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Done</span>
                  <span className="font-display text-lg font-semibold">
                    {cleaningDone}<span className="text-xs text-muted-foreground"> / {cleaningThisWeek.length}</span>
                  </span>
                </div>
                <Progress value={cleaningThisWeek.length ? Math.round((cleaningDone / cleaningThisWeek.length) * 100) : 0} className="h-2" />
              </div>
              <ul className="space-y-1">
                {cleaningThisWeek.slice(0, 5).map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className={cn("truncate", c.done && "text-muted-foreground line-through")}>{c.title}</span>
                    <span className="text-xs text-muted-foreground">{c.zone}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PlanCard>

        <PlanCard title="Caregiving" icon={HeartHandshake} accent="rose">
          {caregivingTasks.length === 0 && weekAppointments.filter(a => a.recipientId).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing flagged for caregiving this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {caregivingTasks.slice(0, 4).map(t => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  {t.dueDate && <span className="text-xs text-muted-foreground">{format(parseISO(t.dueDate), "EEE")}</span>}
                </li>
              ))}
              {weekAppointments.filter(a => a.recipientId).slice(0, 3).map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">📍 {a.title}</span>
                  <span className="text-xs text-muted-foreground">{format(parseISO(a.date), "EEE")} {a.time ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Bills due" icon={Receipt} accent="calm">
          {bills.length === 0 ? (
            <p className="text-xs text-muted-foreground">No bills due this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {bills.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{b.name}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{b.next_due_date ? format(parseISO(b.next_due_date), "EEE MMM d") : ""}</span>
                    <span className="font-medium">${b.amount.toFixed(0)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Birthdays & holidays" icon={Cake} accent="rose">
          {weekBirthdays.length === 0 && weekHolidays.length === 0 ? (
            <p className="text-xs text-muted-foreground">None this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {weekBirthdays.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">🎂 {b.name}</span>
                  <span className="text-xs text-muted-foreground">{format(parseISO(b.date), "MMM d")}</span>
                </li>
              ))}
              {weekHolidays.map(h => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate"><PartyPopper className="mr-1 inline h-3 w-3" />{h.name}</span>
                  <span className="text-xs text-muted-foreground">{format(parseISO(h.date), "MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
        </PlanCard>

        <PlanCard title="Reflection prompts" icon={Heart} accent="rose">
          <ul className="space-y-1.5 text-sm">
            {reflectionPrompts.map(p => (
              <li key={p} className="rounded-md bg-muted/40 px-2.5 py-2 text-muted-foreground">{p}</li>
            ))}
          </ul>
        </PlanCard>
      </div>

      {/* WEEKLY REVIEW */}
      <PlanCard title="Weekly review" icon={NotebookPen} accent="calm">
        <div className="grid gap-3 md:grid-cols-2">
          <ReviewField label="Wins" value={review.wins} onSave={(v) => saveReview({ wins: v })} />
          <ReviewField label="Challenges" value={review.challenges} onSave={(v) => saveReview({ challenges: v })} />
          <ReviewField label="Gratitude" value={review.gratitude} onSave={(v) => saveReview({ gratitude: v })} />
          <ReviewField label="Lessons" value={review.lessons} onSave={(v) => saveReview({ lessons: v })} />
          <ReviewField label="Next week focus" value={review.next_week_focus} onSave={(v) => saveReview({ next_week_focus: v })} className="md:col-span-2" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">How did the week feel?</span>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => saveReview({ rating: n })}
              className={cn(
                "h-7 w-7 rounded-full text-sm transition-all",
                (review.rating ?? 0) >= n ? "bg-accent text-accent-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
              aria-label={`Rate ${n}`}
            >★</button>
          ))}
        </div>
      </PlanCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-2">
      <div className="font-display text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ReviewField({ label, value, onSave, className }: { label: string; value: string | null; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <div className={className}>
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== (value ?? "")) onSave(v); }}
        placeholder="…"
        rows={2}
        className="mt-1"
      />
    </div>
  );
}

function DayPartRow({ icon: Icon, label, items, extras }: { icon: any; label: string; items: string[]; extras: string[] }) {
  const all = [...extras.map(e => `📍 ${e}`), ...items];
  if (!all.length) return (
    <div className="flex items-center gap-1.5 py-0.5 text-[11px] text-muted-foreground/50">
      <Icon className="h-3 w-3" /><span className="w-7">{label}</span><span className="italic">—</span>
    </div>
  );
  return (
    <div className="flex items-start gap-1.5 py-0.5 text-[11px]">
      <Icon className="mt-0.5 h-3 w-3 text-muted-foreground" />
      <span className="w-7 text-muted-foreground">{label}</span>
      <span className="line-clamp-2 text-foreground/90">{all.join(" · ")}</span>
    </div>
  );
}

function GroceryMini() {
  const { state } = useStore();
  const items = state.grocery ?? [];
  const remaining = items.filter(i => !i.bought);
  if (!items.length) return <p className="text-xs text-muted-foreground">Grocery list is empty.</p>;
  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">To buy</span>
          <span className="font-display text-lg font-semibold">
            {remaining.length}<span className="text-xs text-muted-foreground"> / {items.length}</span>
          </span>
        </div>
        <Progress value={items.length ? Math.round(((items.length - remaining.length) / items.length) * 100) : 0} className="h-2" />
      </div>
      <ul className="space-y-1">
        {remaining.slice(0, 5).map(i => (
          <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{i.name}</span>
            {i.qty && <span className="text-xs text-muted-foreground">{i.qty}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}