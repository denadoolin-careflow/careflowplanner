import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { AlertTriangle, CalendarClock, Check, ChevronDown, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import type { Task } from "@/lib/types";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Tasks that are past due, still open and not snoozed away. */
export function useOverdueTasks(reference: Date = new Date()): Task[] {
  const { state } = useStore() as any;
  const todayISO = iso(reference);
  return useMemo(() => {
    return ((state.tasks ?? []) as Task[])
      .filter(t =>
        !t.done &&
        !t.parentTaskId &&
        t.status !== "someday" &&
        t.status !== "parked" &&
        !!t.dueDate &&
        t.dueDate < todayISO &&
        (!t.snoozedUntil || t.snoozedUntil <= todayISO))
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  }, [state.tasks, todayISO]);
}

/**
 * Overdue rescue: everything past due in one place, with one-tap reschedule,
 * snooze (park until a date) and complete.
 */
export function PlannerOverdueSection({ date, className }: { date?: Date; className?: string }) {
  const { updateTask } = useStore() as any;
  const ref = date ?? new Date();
  const overdue = useOverdueTasks(ref);
  const [collapsed, setCollapsed] = useState(false);

  if (overdue.length === 0) return null;

  const reschedule = async (t: Task, target: Date, label: string) => {
    await updateTask(t.id, { dueDate: iso(target) });
    haptics.tap?.();
    toast.success(`Moved to ${label}`, { description: t.title });
  };

  const snooze = async (t: Task, days: number, label: string) => {
    const until = iso(addDays(new Date(), days));
    await updateTask(t.id, { status: "parked", snoozedUntil: until, dueDate: until });
    haptics.tap?.();
    toast(`Snoozed until ${label}`, { description: t.title });
  };

  const bulk = async (kind: "today" | "nextweek") => {
    for (const t of overdue) {
      if (kind === "today") await updateTask(t.id, { dueDate: iso(new Date()) });
      else {
        const until = iso(addDays(new Date(), 7));
        await updateTask(t.id, { status: "parked", snoozedUntil: until, dueDate: until });
      }
    }
    toast.success(kind === "today" ? "All overdue moved to today" : "All overdue snoozed a week");
  };

  return (
    <section
      aria-label="Overdue tasks"
      className={cn("rounded-2xl border border-amber-500/40 bg-amber-500/5", className)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-amber-700/80">Overdue</span>
            <span className="block truncate text-sm font-medium text-foreground">
              {overdue.length} task{overdue.length === 1 ? "" : "s"} need a new date
            </span>
          </span>
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", !collapsed && "rotate-180")} />
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-1.5 px-2 pb-2">
          <div className="flex flex-wrap gap-1.5 px-1">
            <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px]" onClick={() => void bulk("today")}>
              Move all to today
            </Button>
            <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]" onClick={() => void bulk("nextweek")}>
              Snooze all a week
            </Button>
          </div>

          {overdue.map(t => {
            const late = t.dueDate ? differenceInCalendarDays(ref, parseISO(t.dueDate)) : 0;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-border/50 bg-card/70 px-2.5 py-2"
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-label={`Complete ${t.title}`}
                    onClick={() => { void updateTask(t.id, { done: true }); haptics.tap?.(); }}
                    className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-muted-foreground/40 text-transparent transition-colors hover:border-primary hover:text-primary"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[13px] leading-snug text-foreground">{t.title}</p>
                    <p className="text-[11px] text-amber-700/80">
                      {late <= 0 ? "Due today" : `${late} day${late === 1 ? "" : "s"} late`}
                      {t.dueDate ? ` · ${format(parseISO(t.dueDate), "MMM d")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <QuickChip label="Today" onClick={() => void reschedule(t, new Date(), "today")} />
                  <QuickChip label="Tomorrow" onClick={() => void reschedule(t, addDays(new Date(), 1), "tomorrow")} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className={chip}>
                        <CalendarClock className="h-3 w-3" /> Pick date
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-52 space-y-2 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">New due date</div>
                      <input
                        type="date"
                        aria-label="New due date"
                        defaultValue={t.dueDate ?? iso(new Date())}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          void reschedule(t, parseISO(e.target.value), format(parseISO(e.target.value), "MMM d"));
                        }}
                        className="w-full rounded-lg border border-border/60 bg-background px-2 py-1 text-xs"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className={chip}>
                        <Clock3 className="h-3 w-3" /> Snooze
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-44 space-y-1 p-2">
                      <SnoozeItem label="3 days" onClick={() => void snooze(t, 3, "in 3 days")} />
                      <SnoozeItem label="Next week" onClick={() => void snooze(t, 7, "next week")} />
                      <SnoozeItem label="In 2 weeks" onClick={() => void snooze(t, 14, "in 2 weeks")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const chip =
  "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground";

function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={chip}>{label}</button>
  );
}

function SnoozeItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
    >
      {label}
    </button>
  );
}
