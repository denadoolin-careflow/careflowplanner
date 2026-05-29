import { useEffect, useMemo, useState } from "react";
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, isSameMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Heart, Star, Target, Compass, Cake, PartyPopper,
  DollarSign, Receipt, Repeat, Briefcase, NotebookPen, ArrowRight, Plus, X,
  Quote, Image as ImageIcon, Activity, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useMonthlyPlan } from "@/hooks/useMonthlyPlan";
import { useCheckins } from "@/lib/checkins";
import { buildCheckinAppointments } from "@/lib/checkin-calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

function PlanCard({
  title, icon: Icon, accent = "calm", action, children, className,
}: {
  title: string;
  icon: any;
  accent?: "calm" | "warm" | "sage" | "rose";
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
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
          <motion.span
            key={`${s}-${i}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="group inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {s}
            {onRemove && (
              <button onClick={() => onRemove(i)} className="opacity-50 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
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
    <form
      onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (!t) return; onAdd(t); setV(""); }}
      className="mt-2 flex gap-1.5"
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
      <Button type="submit" size="sm" variant="ghost" className="h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
    </form>
  );
}

function recurrenceFalls(dateISO: string | null, monthStart: Date, monthEnd: Date) {
  if (!dateISO) return false;
  const d = parseISO(dateISO);
  // Anniversary-style (birthdays/holidays): match month/day.
  return d.getMonth() === monthStart.getMonth();
}

export function MonthPlanningDashboard({ cursor, onJumpToDate }: { cursor: Date; onJumpToDate?: (d: Date) => void }) {
  const { state } = useStore();
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthLabel = format(cursor, "MMMM yyyy");
  const { intention, review, finance, saveIntention, saveReview, monthISO } = useMonthlyPlan(cursor);

  // Local mirrors for free-text intention fields (save on blur to avoid keystroke writes)
  const [word, setWord] = useState(intention.word ?? "");
  const [intentionText, setIntentionText] = useState(intention.intention ?? "");
  const [emotionalFocus, setEmotionalFocus] = useState(intention.emotional_focus ?? "");
  const [quote, setQuote] = useState(intention.quote ?? "");
  const [vision, setVision] = useState(intention.vision ?? "");
  useEffect(() => { setWord(intention.word ?? ""); }, [intention.word]);
  useEffect(() => { setIntentionText(intention.intention ?? ""); }, [intention.intention]);
  useEffect(() => { setEmotionalFocus(intention.emotional_focus ?? ""); }, [intention.emotional_focus]);
  useEffect(() => { setQuote(intention.quote ?? ""); }, [intention.quote]);
  useEffect(() => { setVision(intention.vision ?? ""); }, [intention.vision]);

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
  const monthHabits = state.habits ?? [];
  const activeProjects = (state.projects ?? []).filter(p => p.status === "active" && (!p.deadline || (p.deadline >= monthISO)));

  // Carry-over: unfinished tasks from prior month with dueDate before this month
  const carryOverCandidates = useMemo(() => {
    const start = startOfMonth(addMonths(cursor, -1));
    const end = endOfMonth(addMonths(cursor, -1));
    return state.tasks.filter(t => !t.done && t.dueDate && isWithinInterval(parseISO(t.dueDate), { start, end }));
  }, [state.tasks, cursor]);
  const isCurrentMonth = isSameMonth(cursor, new Date());

  const { updateTask } = useStore();

  const doCarryOver = async () => {
    if (!carryOverCandidates.length) { toast("Nothing to carry over."); return; }
    const target = format(monthStart, "yyyy-MM-dd");
    await Promise.all(carryOverCandidates.map(t => updateTask(t.id, { dueDate: target })));
    toast(`Carried over ${carryOverCandidates.length} task${carryOverCandidates.length === 1 ? "" : "s"} to ${format(monthStart, "MMM d")}`);
  };

  // -- Intention helpers
  const addPriority = (p: string) => saveIntention({ priorities: [...intention.priorities, p].slice(0, 7) });
  const removePriority = (i: number) => saveIntention({ priorities: intention.priorities.filter((_, idx) => idx !== i) });
  const addFocus = (p: string) => saveIntention({ focus_areas: [...intention.focus_areas, p].slice(0, 8) });
  const removeFocus = (i: number) => saveIntention({ focus_areas: intention.focus_areas.filter((_, idx) => idx !== i) });
  const addMood = (url: string) => saveIntention({ mood_board: [...intention.mood_board, url].slice(0, 12) });
  const removeMood = (i: number) => saveIntention({ mood_board: intention.mood_board.filter((_, idx) => idx !== i) });

  const reflectionPrompts = [
    "What's one small win you want this month?",
    "Who needs your softer attention?",
    "What's draining you that you can let go of?",
    "Where will you protect your energy?",
  ];

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
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Intention</label>
              <Textarea
                value={intentionText}
                onChange={(e) => setIntentionText(e.target.value)}
                onBlur={() => { if (intentionText !== (intention.intention ?? "")) saveIntention({ intention: intentionText }); }}
                placeholder="What do you want this month to feel like?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"><Quote className="mr-1 inline h-3 w-3" />Quote</label>
                <Input
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  onBlur={() => { if (quote !== (intention.quote ?? "")) saveIntention({ quote }); }}
                  placeholder="A line that grounds you"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"><Eye className="mr-1 inline h-3 w-3" />Vision</label>
                <Input
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  onBlur={() => { if (vision !== (intention.vision ?? "")) saveIntention({ vision }); }}
                  placeholder="A picture of done"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </PlanCard>

      {/* GRID OF CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Priorities */}
        <PlanCard title="Priorities" icon={Star} accent="warm">
          <ChipList items={intention.priorities} onRemove={removePriority} />
          <AddInline onAdd={addPriority} placeholder="Add a priority…" />
        </PlanCard>

        {/* Focus areas */}
        <PlanCard title="Focus areas" icon={Compass} accent="sage">
          <ChipList items={intention.focus_areas} onRemove={removeFocus} />
          <AddInline onAdd={addFocus} placeholder="Add a life area…" />
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
            {!isCurrentMonth && carryOverCandidates.length > 0 && (
              <Button variant="outline" size="sm" className="w-full" onClick={doCarryOver}>
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                Carry over {carryOverCandidates.length} unfinished
              </Button>
            )}
            {isCurrentMonth && carryOverCandidates.length > 0 && (
              <Button variant="outline" size="sm" className="w-full" onClick={doCarryOver}>
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                Pull in {carryOverCandidates.length} from last month
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

        {/* Habits */}
        <PlanCard title="Monthly habits" icon={Repeat} accent="sage">
          {monthHabits.length === 0 ? (
            <p className="text-xs text-muted-foreground">No habits tracked yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {monthHabits.slice(0, 6).map(h => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{h.title}</span>
                  <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-xs">{h.streak ?? 0}d streak</span>
                </li>
              ))}
            </ul>
          )}
        </PlanCard>

        {/* Projects this month */}
        <PlanCard title="Projects this month" icon={Briefcase} accent="warm">
          {activeProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active projects.</p>
          ) : (
            <ul className="space-y-1.5">
              {activeProjects.slice(0, 6).map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.icon ? `${p.icon} ` : ""}{p.name}</span>
                  {p.deadline && (
                    <span className="text-xs text-muted-foreground">{format(parseISO(p.deadline), "MMM d")}</span>
                  )}
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

        {/* Mood board */}
        <PlanCard title="Mood board" icon={ImageIcon} accent="warm">
          {intention.mood_board.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add image URLs that capture the feeling of this month.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {intention.mood_board.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <button
                    onClick={() => removeMood(i)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <AddInline onAdd={addMood} placeholder="Paste image URL…" />
        </PlanCard>

        {/* Reflection prompts */}
        <PlanCard title="Reflection" icon={Heart} accent="rose">
          <ul className="space-y-1.5 text-sm">
            {reflectionPrompts.map(p => (
              <li key={p} className="rounded-md bg-muted/40 px-2.5 py-2 text-muted-foreground">{p}</li>
            ))}
          </ul>
        </PlanCard>
      </div>

      {/* MONTHLY REVIEW */}
      <PlanCard title="Monthly review" icon={NotebookPen} accent="calm">
        <div className="grid gap-3 md:grid-cols-2">
          <ReviewField label="Wins" value={review.wins} onSave={(v) => saveReview({ wins: v })} />
          <ReviewField label="Challenges" value={review.challenges} onSave={(v) => saveReview({ challenges: v })} />
          <ReviewField label="Gratitude" value={review.gratitude} onSave={(v) => saveReview({ gratitude: v })} />
          <ReviewField label="Lessons" value={review.lessons} onSave={(v) => saveReview({ lessons: v })} />
          <ReviewField label="Next month focus" value={review.next_month_focus} onSave={(v) => saveReview({ next_month_focus: v })} className="md:col-span-2" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">How did the month feel?</span>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => saveReview({ rating: n })}
              className={cn(
                "h-7 w-7 rounded-full text-sm transition-all",
                (review.rating ?? 0) >= n ? "bg-accent text-accent-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
              aria-label={`Rate ${n}`}
            >
              ★
            </button>
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