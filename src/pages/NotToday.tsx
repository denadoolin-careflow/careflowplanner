import { useMemo, useState } from "react";
import { format, addDays, parseISO, isAfter } from "date-fns";
import { Coffee, CalendarDays, Undo2, Sparkles, Inbox as InboxIcon } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import type { Task } from "@/lib/types";
import { TaskRow } from "@/components/cards/TaskRow";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

/**
 * "Not Today" — a calm parking lot for tasks you don't want to think about right now.
 * Items can be parked indefinitely or until a chosen date, and surface back
 * automatically when that date arrives.
 */
export default function NotToday() {
  const { state, updateTask } = useStore();
  const today = todayISO();

  const parked = useMemo(
    () =>
      state.tasks
        .filter((t) => !t.done && !t.parentTaskId && t.status === "parked")
        .sort((a, b) => {
          const ka = a.snoozedUntil ?? "9999-12-31";
          const kb = b.snoozedUntil ?? "9999-12-31";
          return ka.localeCompare(kb);
        }),
    [state.tasks],
  );

  const due = parked.filter((t) => t.snoozedUntil && t.snoozedUntil <= today);
  const upcoming = parked.filter((t) => t.snoozedUntil && t.snoozedUntil > today);
  const indefinite = parked.filter((t) => !t.snoozedUntil);

  const bring = async (id: string, when: "today" | "tomorrow" | "next-week" | "clear" | Date) => {
    let due: string | undefined;
    if (when === "today") due = today;
    else if (when === "tomorrow") due = format(addDays(new Date(), 1), "yyyy-MM-dd");
    else if (when === "next-week") due = format(addDays(new Date(), 7), "yyyy-MM-dd");
    else if (when instanceof Date) due = format(when, "yyyy-MM-dd");
    await updateTask(id, {
      status: "active",
      snoozedUntil: undefined,
      dueDate: due,
    });
    toast.success(
      when === "clear"
        ? "Back in your active list"
        : `Scheduled for ${due === today ? "today" : format(parseISO(due!), "EEE MMM d")}`,
    );
  };

  const reschedule = async (id: string, d: Date) => {
    await updateTask(id, { snoozedUntil: format(d, "yyyy-MM-dd") });
    toast.success(`Will surface on ${format(d, "EEE MMM d")}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/40 text-foreground">
          <Coffee className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Not Today</h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            A safe parking lot. {parked.length} item{parked.length === 1 ? "" : "s"} resting here.
          </p>
        </div>
      </header>

      {parked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary/70" />
          <p className="text-sm text-muted-foreground">
            Nothing parked. Use “Not today” on any task to gently move it here.
          </p>
        </div>
      ) : (
        <>
          <Group
            label="Ready to revisit"
            tone="primary"
            tasks={due}
            onBring={bring}
            onReschedule={reschedule}
          />
          <Group
            label="Indefinite"
            tone="muted"
            description="No return date — bring back whenever you're ready."
            tasks={indefinite}
            onBring={bring}
            onReschedule={reschedule}
          />
          <Group
            label="Waiting their turn"
            tone="accent"
            description="Will quietly return on the date set."
            tasks={upcoming}
            onBring={bring}
            onReschedule={reschedule}
            showWhen
          />
        </>
      )}
    </div>
  );
}

function Group({
  label, description, tasks, onBring, onReschedule, showWhen, tone,
}: {
  label: string;
  description?: string;
  tasks: Task[];
  onBring: (id: string, when: "today" | "tomorrow" | "next-week" | "clear" | Date) => void;
  onReschedule: (id: string, d: Date) => void;
  showWhen?: boolean;
  tone?: "primary" | "muted" | "accent";
}) {
  if (!tasks.length) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2 px-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </h2>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{tasks.length}</span>
        {description && (
          <span className="ml-2 text-[11px] text-muted-foreground/70">{description}</span>
        )}
      </div>
      <div className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-2">
        {tasks.map((t) => (
          <div key={t.id} className="space-y-1.5">
            <TaskRow task={t} />
            <div className="ml-10 flex flex-wrap items-center gap-1.5">
              {showWhen && t.snoozedUntil && (
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {format(parseISO(t.snoozedUntil), "EEE MMM d")}
                </span>
              )}
              <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs" onClick={() => onBring(t.id, "today")}>
                <Undo2 className="mr-1 h-3 w-3" /> Today
              </Button>
              <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs" onClick={() => onBring(t.id, "tomorrow")}>
                Tomorrow
              </Button>
              <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs" onClick={() => onBring(t.id, "next-week")}>
                Next week
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs">
                    <CalendarDays className="mr-1 h-3 w-3" /> Pick date
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    mode="single"
                    onSelect={(d) => d && onBring(t.id, d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs text-muted-foreground">
                    Reschedule return…
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    mode="single"
                    onSelect={(d) => d && isAfter(d, new Date()) && onReschedule(t.id, d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button size="sm" variant="ghost" className="ml-auto h-7 rounded-full px-2.5 text-xs text-muted-foreground" onClick={() => onBring(t.id, "clear")}>
                <InboxIcon className="mr-1 h-3 w-3" /> Back to inbox
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* token usage hint — tone is kept for future styling extensions */
export { Group as _NotTodayGroup };