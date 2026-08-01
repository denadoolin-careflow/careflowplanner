import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import {
  Sparkles, Star, Compass, NotebookPen, Activity, Sun, Sunset, Moon,
  ArrowRight, Sparkle, ChevronRight,
} from "lucide-react";
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
import { PlanCard, ChipList, AddInline, Stat, ReviewField, RatingStars } from "@/components/planning";

function recurringFallsThisWeek(dateISO: string | null, weekStart: Date, weekEnd: Date): boolean {
  if (!dateISO) return false;
  const d = parseISO(dateISO);
  const year = weekStart.getFullYear();
  const candidates = [new Date(year, d.getMonth(), d.getDate()), new Date(year + 1, d.getMonth(), d.getDate())];
  return candidates.some(c => c >= weekStart && c <= weekEnd);
}

/** One count pill in the "This week elsewhere" row. */
function ElsewherePill({ to, label, value }: { to: string; label: string; value: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
    >
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="font-display text-base font-semibold leading-tight">{value}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * Week = plan. Intention, Top 3, priorities, the day-by-day grid, progress,
 * a compact "elsewhere" summary, and the one full review level in the app.
 */
export function WeekPlanningDashboard({
  weekStart, onJumpToDay,
}: { weekStart: Date; onJumpToDay?: (d: Date) => void }) {
  const { state, updateTask } = useStore();
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

  // Counts for the "elsewhere" row
  const weekBirthdays = state.birthdays.filter(b => recurringFallsThisWeek(b.date, monday, sunday));
  const weekHolidays = state.holidays.filter(h => recurringFallsThisWeek(h.date, monday, sunday));
  const weekMeals = state.meals.filter(m => isWithinInterval(parseISO(m.date), { start: monday, end: sunday }));
  const projectTasks = weekTasks.filter(t => (t as any).projectId);
  const caregivingTasks = weekTasks.filter(t => t.area === "Caregiving" || t.recipientId);
  const cleaningThisWeek = (state.cleaning ?? []).filter(c => c.cadence === "weekly" || c.cadence === "daily");
  const cleaningDone = cleaningThisWeek.filter(c => c.done).length;
  const dailyHabits = (state.habits ?? []).filter(h => h.cadence === "daily");
  const habitHits = dailyHabits.reduce(
    (n, h) => n + days.filter(d => h.log[format(d, "yyyy-MM-dd")]).length, 0,
  );
  const habitTarget = dailyHabits.length * 7;
  const groceryItems = state.grocery ?? [];
  const groceryLeft = groceryItems.filter(i => !i.bought).length;
  const activeGoals = state.goals.filter(g => g.status === "active");

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
    const goalTitles = activeGoals.slice(0, 3).map(g => g.title);
    const next = [
      ...intention.top_three,
      ...goalTitles.filter(t => !intention.top_three.includes(t)),
    ].slice(0, 3);
    await saveIntention({ top_three: next });
    toast("Pulled top 3 from your active goals");
  };

  const addPriority = (p: string) => saveIntention({ priorities: [...intention.priorities, p].slice(0, 7) });
  const removePriority = (i: number) => saveIntention({ priorities: intention.priorities.filter((_, idx) => idx !== i) });
  const addTop3 = (p: string) => saveIntention({ top_three: [...intention.top_three, p].slice(0, 3) });
  const removeTop3 = (i: number) => saveIntention({ top_three: intention.top_three.filter((_, idx) => idx !== i) });

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

      {/* THIS WEEK ELSEWHERE */}
      <PlanCard title="This week elsewhere" icon={ChevronRight} accent="sage">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <ElsewherePill to="/meals" label="Meals" value={`${weekMeals.length} planned`} />
          <ElsewherePill to="/home/groceries" label="Grocery" value={`${groceryLeft} to buy`} />
          <ElsewherePill to="/home-reset" label="Cleaning" value={`${cleaningDone}/${cleaningThisWeek.length}`} />
          <ElsewherePill to="/wealth" label="Bills" value={`${bills.length} due`} />
          <ElsewherePill to="/caregiving" label="Caregiving" value={`${caregivingTasks.length} items`} />
          <ElsewherePill to="/projects" label="Projects" value={`${projectTasks.length} tasks`} />
          <ElsewherePill to="/habits" label="Habits" value={habitTarget ? `${habitHits}/${habitTarget}` : "None yet"} />
          <ElsewherePill to="/goals" label="Goals" value={`${activeGoals.length} active`} />
          <ElsewherePill to="/calendar" label="Dates" value={`${weekBirthdays.length + weekHolidays.length} this week`} />
        </div>
      </PlanCard>

      {/* WEEKLY REVIEW */}
      <PlanCard title="Weekly review" icon={NotebookPen} accent="calm">
        <div className="grid gap-3 md:grid-cols-2">
          <ReviewField label="Wins" value={review.wins} onSave={(v) => saveReview({ wins: v })} />
          <ReviewField label="Challenges" value={review.challenges} onSave={(v) => saveReview({ challenges: v })} />
          <ReviewField label="Gratitude" value={review.gratitude} onSave={(v) => saveReview({ gratitude: v })} />
          <ReviewField label="Lessons" value={review.lessons} onSave={(v) => saveReview({ lessons: v })} />
          <ReviewField label="Next week focus" value={review.next_week_focus} onSave={(v) => saveReview({ next_week_focus: v })} className="md:col-span-2" />
        </div>
        <div className="mt-3">
          <RatingStars label="How did the week feel?" value={review.rating} onChange={(n) => saveReview({ rating: n })} />
        </div>
      </PlanCard>
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
