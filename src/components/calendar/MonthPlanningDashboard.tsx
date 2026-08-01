import { useEffect, useMemo, useState } from "react";
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, isSameMonth } from "date-fns";
import {
  Sparkles, Star, Target, Cake, PartyPopper, DollarSign, Receipt,
  NotebookPen, ArrowRight, Activity,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useMonthlyPlan } from "@/hooks/useMonthlyPlan";
import { useCheckins } from "@/lib/checkins";
import { buildCheckinAppointments } from "@/lib/checkin-calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { PlanCard, ChipList, AddInline, Stat, ReviewField, RatingStars } from "@/components/planning";

function recurrenceFalls(dateISO: string | null, monthStart: Date, _monthEnd: Date) {
  if (!dateISO) return false;
  const d = parseISO(dateISO);
  // Anniversary-style (birthdays/holidays): match month/day.
  return d.getMonth() === monthStart.getMonth();
}

/** Month = reflect & anticipate. Intention, priorities, goals, key dates, money, light review. */
export function MonthPlanningDashboard({ cursor, onJumpToDate }: { cursor: Date; onJumpToDate?: (d: Date) => void }) {
  const { state, updateTask } = useStore();
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthLabel = format(cursor, "MMMM yyyy");
  const { intention, review, finance, saveIntention, saveReview } = useMonthlyPlan(cursor);

  // Local mirrors for free-text intention fields (save on blur to avoid keystroke writes)
  const [word, setWord] = useState(intention.word ?? "");
  const [intentionText, setIntentionText] = useState(intention.intention ?? "");
  const [emotionalFocus, setEmotionalFocus] = useState(intention.emotional_focus ?? "");
  useEffect(() => { setWord(intention.word ?? ""); }, [intention.word]);
  useEffect(() => { setIntentionText(intention.intention ?? ""); }, [intention.intention]);
  useEffect(() => { setEmotionalFocus(intention.emotional_focus ?? ""); }, [intention.emotional_focus]);

  // Derived month slices
  const monthTasks = useMemo(
    () => state.tasks.filter(t =>
      t.dueDate && isWithinInterval(parseISO(t.dueDate), { start: monthStart, end: monthEnd })
    ),
    [state.tasks, monthStart, monthEnd],
  );
  const completedThisMonth = monthTasks.filter(t => t.done).length;
  const completionPct = monthTasks.length ? Math.round((completedThisMonth / monthTasks.length) * 100) : 0;

  const checkins = useCheckins();
  const checkinEvents = useMemo(
    () => buildCheckinAppointments(checkins, state.recipients ?? [], monthStart, 35),
    [checkins, state.recipients, monthStart],
  );
  const monthAppointments = useMemo(
    () => [...state.appointments, ...checkinEvents].filter(a =>
      isWithinInterval(parseISO(a.date), { start: monthStart, end: monthEnd })
    ),
    [state.appointments, checkinEvents, monthStart, monthEnd],
  );
  const monthBirthdays = state.birthdays.filter(b => recurrenceFalls(b.date, monthStart, monthEnd));
  const monthHolidays = state.holidays.filter(h => recurrenceFalls(h.date, monthStart, monthEnd));
  const monthGoals = state.goals.filter(g => g.status === "active");

  // Carry-over: unfinished tasks from the prior month
  const carryOverCandidates = useMemo(() => {
    const start = startOfMonth(addMonths(cursor, -1));
    const end = endOfMonth(addMonths(cursor, -1));
    return state.tasks.filter(t => !t.done && t.dueDate && isWithinInterval(parseISO(t.dueDate), { start, end }));
  }, [state.tasks, cursor]);
  const isCurrentMonth = isSameMonth(cursor, new Date());

  const doCarryOver = async () => {
    if (!carryOverCandidates.length) { toast("Nothing to carry over."); return; }
    const target = format(monthStart, "yyyy-MM-dd");
    await Promise.all(carryOverCandidates.map(t => updateTask(t.id, { dueDate: target })));
    toast(`Carried over ${carryOverCandidates.length} task${carryOverCandidates.length === 1 ? "" : "s"} to ${format(monthStart, "MMM d")}`);
  };

  const addPriority = (p: string) => saveIntention({ priorities: [...intention.priorities, p].slice(0, 7) });
  const removePriority = (i: number) => saveIntention({ priorities: intention.priorities.filter((_, idx) => idx !== i) });

  /** Focus areas merged into Priorities — old entries stay promotable so nothing looks lost. */
  const legacyFocus = (intention.focus_areas ?? []).filter(f => !intention.priorities.includes(f));
  const promoteFocus = (f: string) => {
    if (intention.priorities.length >= 7) { toast("Priorities are full — remove one first."); return; }
    saveIntention({
      priorities: [...intention.priorities, f].slice(0, 7),
      focus_areas: (intention.focus_areas ?? []).filter(x => x !== f),
    });
  };

  return (
    <div className="space-y-5">
      {/* HERO INTENTION */}
      <PlanCard title={`Intention for ${monthLabel}`} icon={Sparkles} accent="warm" className="overflow-visible">
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Word of the month</label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onBlur={() => { if (word !== (intention.word ?? "")) saveIntention({ word }); }}
              placeholder="e.g. Soft"
              className="h-14 border-0 bg-gradient-to-br from-accent/20 to-primary/10 text-center font-display text-3xl font-semibold tracking-tight"
            />
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Emotional focus</label>
              <Input
                value={emotionalFocus}
                onChange={(e) => setEmotionalFocus(e.target.value)}
                onBlur={() => { if (emotionalFocus !== (intention.emotional_focus ?? "")) saveIntention({ emotional_focus: emotionalFocus }); }}
                placeholder="e.g. Calm presence"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Intention</label>
            <Textarea
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              onBlur={() => { if (intentionText !== (intention.intention ?? "")) saveIntention({ intention: intentionText }); }}
              placeholder="What do you want this month to feel like?"
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
      </PlanCard>

      {/* GRID OF CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Priorities (absorbs focus areas) */}
        <PlanCard title="Priorities" icon={Star} accent="warm">
          <ChipList items={intention.priorities} onRemove={removePriority} />
          <AddInline onAdd={addPriority} placeholder="Add a priority…" />
          {legacyFocus.length > 0 && (
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                Earlier focus areas — tap to move one into your priorities.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {legacyFocus.map(f => (
                  <button
                    key={f}
                    onClick={() => promoteFocus(f)}
                    className="rounded-full bg-background px-2.5 py-1 text-xs hover:bg-primary/10"
                  >{f}</button>
                ))}
              </div>
            </div>
          )}
        </PlanCard>

        {/* Progress */}
        <PlanCard title="Month progress" icon={Activity} accent="calm">
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Tasks completed</span>
                <span className="font-display text-2xl font-semibold">{completedThisMonth}<span className="text-sm text-muted-foreground"> / {monthTasks.length}</span></span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Appointments" value={monthAppointments.length} />
              <Stat label="Birthdays" value={monthBirthdays.length} />
              <Stat label="Holidays" value={monthHolidays.length} />
            </div>
            {carryOverCandidates.length > 0 && (
              <Button variant="outline" size="sm" className="w-full" onClick={doCarryOver}>
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                {isCurrentMonth
                  ? `Pull in ${carryOverCandidates.length} from last month`
                  : `Carry over ${carryOverCandidates.length} unfinished`}
              </Button>
            )}
          </div>
        </PlanCard>

        {/* Monthly goals */}
        <PlanCard title="Monthly goals" icon={Target} accent="calm">
          {monthGoals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active goals. Set some on the Goals page.</p>
          ) : (
            <ul className="space-y-2">
              {monthGoals.slice(0, 5).map(g => (
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

        {/* Bills + budget */}
        <PlanCard title="Bills & budget" icon={DollarSign} accent="calm">
          <div className="space-y-3">
            {finance.budgetTotal > 0 && (
              <div>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-display text-lg font-semibold">${finance.spentThisMonth.toFixed(0)}<span className="text-xs text-muted-foreground"> / ${finance.budgetTotal.toFixed(0)}</span></span>
                </div>
                <Progress value={Math.min(100, (finance.spentThisMonth / finance.budgetTotal) * 100)} className="h-2" />
              </div>
            )}
            {finance.bills.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bills due this month.</p>
            ) : (
              <ul className="space-y-1.5">
                {finance.bills.slice(0, 5).map(b => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{b.next_due_date ? format(parseISO(b.next_due_date), "MMM d") : ""}</span>
                      <span className="font-medium">${Number(b.amount).toFixed(0)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PlanCard>

        {/* Birthdays */}
        <PlanCard title="Birthdays" icon={Cake} accent="rose">
          {monthBirthdays.length === 0 ? (
            <p className="text-xs text-muted-foreground">None this month.</p>
          ) : (
            <ul className="space-y-1.5">
              {monthBirthdays.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <button
                    onClick={() => onJumpToDate?.(parseISO(b.date.replace(/^\d{4}/, format(cursor, "yyyy"))))}
                    className="truncate text-left hover:text-foreground"
                  >
                    {b.name} {b.relation && <span className="text-xs text-muted-foreground">· {b.relation}</span>}
                  </button>
                  <span className="text-xs text-muted-foreground">{format(parseISO(b.date), "MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
        </PlanCard>

        {/* Holidays */}
        <PlanCard title="Holidays & key events" icon={PartyPopper} accent="sage">
          {monthHolidays.length === 0 && monthAppointments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing flagged.</p>
          ) : (
            <ul className="space-y-1.5">
              {monthHolidays.map(h => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">✨ {h.name}</span>
                  <span className="text-xs text-muted-foreground">{format(parseISO(h.date), "MMM d")}</span>
                </li>
              ))}
              {monthAppointments.slice(0, 3).map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">📍 {a.title}</span>
                  <span className="text-xs text-muted-foreground">{format(parseISO(a.date), "MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
        </PlanCard>
      </div>

      {/* MONTHLY REVIEW */}
      <PlanCard title="Monthly review" icon={NotebookPen} accent="calm">
        <div className="grid gap-3 md:grid-cols-2">
          <ReviewField label="Wins" value={review.wins} onSave={(v) => saveReview({ wins: v })} />
          <ReviewField label="Next month focus" value={review.next_month_focus} onSave={(v) => saveReview({ next_month_focus: v })} />
        </div>
        <div className="mt-3">
          <RatingStars label="How did the month feel?" value={review.rating} onChange={(n) => saveReview({ rating: n })} />
        </div>
      </PlanCard>
    </div>
  );
}
