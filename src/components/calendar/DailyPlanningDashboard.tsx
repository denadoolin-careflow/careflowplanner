import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Star, Clock, ListChecks, Sparkles, Plus, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { PlanCard, ChipList, ReviewField } from "@/components/planning";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { hourToDayPart } from "@/lib/long-press-drag";
import { CycleLogSheet } from "@/components/cycle/CycleLogSheet";
import { PlannerAtmosphereStrip } from "@/components/planner/PlannerAtmosphereStrip";
import { apptOccursOn, apptRangeMeta } from "@/lib/appointment-range";
import { openTaskEditor } from "@/lib/open-task-editor";

/**
 * Inline picker: select from today's existing tasks or type a brand-new one.
 * New entries become a real task on `dateISO` and are added to the chip list.
 */
function TaskPickerInline({
  dateISO, existingChips, placeholder, onPick, onCreate,
}: {
  dateISO: string;
  existingChips: string[];
  placeholder: string;
  onPick: (title: string) => void;
  onCreate: (title: string) => Promise<void> | void;
}) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const todayTasks = useMemo(
    () => state.tasks.filter(t => t.dueDate === dateISO && !t.parentTaskId),
    [state.tasks, dateISO],
  );
  const taken = new Set(existingChips.map(c => c.toLowerCase()));
  const q = query.trim().toLowerCase();
  const filtered = todayTasks.filter(t => {
    if (taken.has(t.title.toLowerCase())) return false;
    return !q || t.title.toLowerCase().includes(q);
  });

  const commitNew = async () => {
    const t = query.trim();
    if (!t) return;
    await onCreate(t);
    setQuery(""); setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="mt-2 h-8 rounded-full px-3 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" /> {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-3">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pick today's task or type new…"
          className="h-8 rounded-lg text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void commitNew(); } }}
        />
        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
              {todayTasks.length === 0
                ? "Nothing planned for today yet — type to add a new task."
                : "All today's tasks already added. Type to create a new one."}
            </p>
          )}
          {filtered.slice(0, 8).map(t => (
            <button
              key={t.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10"
              onClick={() => { onPick(t.title); setQuery(""); setOpen(false); }}
            >
              <Star className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </button>
          ))}
        </div>
        {query.trim() && (
          <Button size="sm" className="mt-2 h-7 w-full rounded-full text-xs" onClick={() => void commitNew()}>
            <Plus className="mr-1 h-3 w-3" /> Create “{query.trim()}”
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Day = execute. A slim atmosphere strip, the time grid, Top 3, today's tasks,
 * and a two-line intention/close row. Deeper reflection lives in Morning Check-In.
 */
export function DailyPlanningDashboard({ day }: { day: Date }) {
  const { state, toggleTask, updateTask, updateAppointment, addTask } = useStore();
  const { intention, review, saveIntention, saveReview, dateISO } = useDailyPlan(day);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;

  const [intentionText, setIntentionText] = useState(intention.intention ?? "");
  useEffect(() => { setIntentionText(intention.intention ?? ""); }, [intention.intention]);

  const dayTasks = useMemo(
    () => state.tasks.filter(t => t.dueDate === dateISO && !t.parentTaskId),
    [state.tasks, dateISO],
  );
  const doneCount = dayTasks.filter(t => t.done).length;

  /** Legacy priorities from before Top 3 absorbed them — surfaced so nothing looks lost. */
  const legacyPriorities = (intention.priorities ?? []).filter(p => !intention.top_three.includes(p));

  const addTop3 = (p: string) => saveIntention({ top_three: [...intention.top_three, p].slice(0, 3) });
  const removeTop3 = (i: number) => saveIntention({ top_three: intention.top_three.filter((_, idx) => idx !== i) });
  const clearLegacy = () => saveIntention({ priorities: [] });

  const promoteLegacy = (p: string) => {
    if (intention.top_three.length >= 3) { toast("Top 3 is full — remove one first."); return; }
    saveIntention({
      top_three: [...intention.top_three, p].slice(0, 3),
      priorities: (intention.priorities ?? []).filter(x => x !== p),
    });
  };

  const createTaskFor = async (title: string, then: (t: string) => void) => {
    await addTask({ title, dueDate: dateISO, inbox: false });
    then(title);
    toast.success(`Added “${title}” to today`);
  };

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => apptOccursOn(a, k)).map(a => {
      const m = apptRangeMeta(a, k);
      const prefix = m.isMulti && !m.isStart ? (m.isEnd ? "↦ " : "· ") : "";
      return { label: `${prefix}${a.title}`, time: m.isStart ? a.time : undefined, id: a.id, kind: "appt" as const };
    }),
    ...state.tasks.filter(t => t.dueDate === k && !t.parentTaskId).map(t => ({
      label: t.title, time: undefined as string | undefined, id: t.id, kind: "task" as const, done: t.done,
    })),
  ];

  const handleTimeDrop = async (taskId: string, iso: string, startHour: number) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    const dp = hourToDayPart(startHour);
    const dayPart = dp ? ((dp[0].toUpperCase() + dp.slice(1)) as "Morning" | "Afternoon" | "Evening") : undefined;
    await updateTask(taskId, { dueDate: iso, inbox: false, ...(dayPart ? { dayPart } : {}) });
    const hh = String(Math.floor(startHour)).padStart(2, "0");
    const mm = String(Math.round((startHour % 1) * 60)).padStart(2, "0");
    toast.success(`Scheduled "${t.title}"`, { description: `${hh}:${mm}` });
  };

  const handleApptDrop = async (apptId: string, iso: string, startHour: number) => {
    const a = state.appointments.find(x => x.id === apptId);
    if (!a) return;
    const hh = String(Math.floor(startHour)).padStart(2, "0");
    const mm = String(Math.round((startHour % 1) * 60)).padStart(2, "0");
    await updateAppointment(apptId, { date: iso, time: `${hh}:${mm}` });
    toast.success(`Moved "${a.title}"`, { description: `to ${hh}:${mm}` });
  };

  return (
    <div className="space-y-4">
      {/* CONTEXT STRIP */}
      <div className="flex flex-wrap items-center gap-2">
        <PlannerAtmosphereStrip date={day} className="flex-1" />
        <Button size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs" onClick={() => setCycleOpen(true)}>
          <Moon className="mr-1 h-3.5 w-3.5" /> Log cycle
        </Button>
      </div>

      {/* SCHEDULE */}
      <PlanCard title="Schedule" icon={Clock} accent="calm">
        <div className="-mx-2">
          <TimeGrid
            days={[day]}
            appointmentsOn={eventsOn}
            onTaskDropAt={handleTimeDrop}
            onApptDropAt={handleApptDrop}
            onApptClick={setEditApptId}
          />
        </div>
      </PlanCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* TOP 3 */}
        <PlanCard title="Top 3 today" icon={Star} accent="warm">
          <ChipList items={intention.top_three} onRemove={removeTop3} emptyLabel="Nothing pinned yet." />
          <TaskPickerInline
            dateISO={dateISO}
            existingChips={intention.top_three}
            placeholder="Pick or create a top focus"
            onPick={addTop3}
            onCreate={(t) => createTaskFor(t, addTop3)}
          />
          {legacyPriorities.length > 0 && (
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                Earlier priorities for this day — tap to move one into your Top 3.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {legacyPriorities.map(p => (
                  <button
                    key={p}
                    onClick={() => promoteLegacy(p)}
                    className="rounded-full bg-background px-2.5 py-1 text-xs hover:bg-primary/10"
                  >{p}</button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-1.5 h-6 px-2 text-[11px]" onClick={clearLegacy}>
                Dismiss
              </Button>
            </div>
          )}
        </PlanCard>

        {/* TODAY'S TASKS */}
        <PlanCard
          title="Today's tasks"
          icon={ListChecks}
          accent="sage"
          action={<span className="text-xs tabular-nums text-muted-foreground">{doneCount}/{dayTasks.length}</span>}
        >
          {dayTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing scheduled for today yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {dayTasks.map(t => (
                <li key={t.id} className="flex items-center gap-2">
                  <Checkbox checked={t.done} onCheckedChange={() => void toggleTask(t.id)} aria-label={`Complete ${t.title}`} />
                  <button
                    onClick={() => openTaskEditor(t.id)}
                    className={cn("min-w-0 flex-1 truncate text-left text-sm hover:underline", t.done && "text-muted-foreground line-through")}
                  >
                    {t.title}
                  </button>
                  {t.dayPart && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.dayPart}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </PlanCard>
      </div>

      {/* SLIM INTENTION / CLOSE */}
      <PlanCard title={`Intention for ${format(day, "EEEE, MMM d")}`} icon={Sparkles} accent="rose">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Intention</label>
            <Input
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              onBlur={() => { if (intentionText !== (intention.intention ?? "")) saveIntention({ intention: intentionText }); }}
              placeholder="One line for how today should feel…"
              className="mt-1"
            />
          </div>
          <ReviewField
            label="Tomorrow's focus"
            value={review.tomorrow_focus}
            onSave={(v) => saveReview({ tomorrow_focus: v })}
            rows={1}
            placeholder="One thing to carry forward…"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Deeper reflection lives in your Morning Check-In and the Weekly review.
        </p>
      </PlanCard>

      <CycleLogSheet open={cycleOpen} onOpenChange={setCycleOpen} date={day} />
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
    </div>
  );
}
