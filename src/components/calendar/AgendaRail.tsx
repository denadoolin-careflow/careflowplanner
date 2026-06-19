import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Plus, Sunrise, Sun, Moon, Check, CalendarClock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarItemCard } from "@/components/calendar/CalendarItemCard";
import { useStore } from "@/lib/store";

type EventItem = {
  kind: "appt" | "bday" | "hol" | "gcal" | "task" | "care" | "meal" | "season" | "cosmic";
  id?: string;
  label: string;
  time?: string;
  color?: string;
};

// Must match the MIME used by CalendarPage MonthView drop handler.
const ITEM_DRAG_MIME = "application/x-careflow-item";

type PartKey = "allday" | "morning" | "afternoon" | "evening";
const PARTS: { key: PartKey; label: string; Icon: typeof Sunrise }[] = [
  { key: "allday",    label: "All day",   Icon: CalendarClock },
  { key: "morning",   label: "Morning",   Icon: Sunrise },
  { key: "afternoon", label: "Afternoon", Icon: Sun },
  { key: "evening",   label: "Evening",   Icon: Moon },
];
function partOf(t?: string): PartKey {
  if (!t || !/^\d{2}:\d{2}/.test(t)) return "allday";
  const h = parseInt(t.slice(0, 2), 10);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function AgendaRail({
  cursor,
  eventsOn,
  days = 30,
  onItemClick,
  onItemReschedule,
  onAddForDate,
}: {
  cursor: Date;
  eventsOn: (iso: string) => EventItem[];
  days?: number;
  onItemClick?: (item: EventItem) => void;
  onItemReschedule?: (item: EventItem, patch: { date?: string; time?: string | null }) => void | Promise<void>;
  onAddForDate?: (iso: string) => void;
}) {
  const { state, toggleTask } = useStore();
  const navigate = useNavigate();
  const [justDone, setJustDone] = useState<Set<string>>(new Set());

  const flashDone = (id: string) => {
    setJustDone(prev => new Set(prev).add(id));
    window.setTimeout(() => {
      setJustDone(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 900);
  };

  const handleItemClick = (it: EventItem) => {
    if (it.kind === "cosmic" && it.id) {
      navigate(`/cosmic-flow/event/${encodeURIComponent(it.id)}`);
      return;
    }
    onItemClick?.(it);
  };

  const isInteractive = (it: EventItem) =>
    (it.kind === "cosmic" && !!it.id) ||
    (((it.kind === "appt" || it.kind === "task" || it.kind === "care" || it.kind === "bday" || it.kind === "hol") && !!it.id));

  const isReschedulable = (it: EventItem) =>
    !!onItemReschedule && ((it.kind === "appt" || it.kind === "task" || it.kind === "care" || it.kind === "bday" || it.kind === "hol") && !!it.id);

  const range = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(cursor, i)),
    [cursor, days],
  );

  const grouped = range
    .map((d) => {
      const iso = format(d, "yyyy-MM-dd");
      return { d, iso, items: eventsOn(iso) };
    })
    .filter((g) => g.items.length > 0);

  return (
    <div className="cozy-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Agenda</div>
          <h3 className="font-display text-lg font-semibold">All events &amp; tasks</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">Next {days} days</span>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
          Nothing scheduled. Click a day on the calendar to add something.
        </p>
      ) : (
        <ol className="space-y-4">
          {grouped.map(({ d, iso, items }) => {
            const today = isSameDay(d, new Date());
            const buckets: Record<PartKey, EventItem[]> = { allday: [], morning: [], afternoon: [], evening: [] };
            for (const it of items) buckets[partOf(it.time)].push(it);
            for (const k of ["morning","afternoon","evening"] as PartKey[]) {
              buckets[k].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
            }
            return (
              <li key={iso}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                        today
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground/80",
                      )}
                    >
                      {format(d, "d")}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {format(d, "EEE")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(d, "MMM")}
                    </span>
                  </div>
                  {onAddForDate && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-full"
                      aria-label={`Add to ${format(d, "MMM d")}`}
                      onClick={() => onAddForDate(iso)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {PARTS.map(p => {
                    const list = buckets[p.key];
                    if (list.length === 0) return null;
                    const Icon = p.Icon;
                    return (
                      <div key={p.key}>
                        <div className="mb-1 flex items-center gap-1 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          <Icon className="h-3 w-3" />
                          {p.label}
                          <span className="opacity-60">· {list.length}</span>
                        </div>
                        <ul className="space-y-1">
                          {list.map((it, i) => {
                            const interactive = isInteractive(it);
                            const draggable = isReschedulable(it);
                            const isTask = (it.kind === "task" || it.kind === "care") && !!it.id;
                            const task = isTask ? state.tasks.find(t => t.id === it.id) : undefined;
                            const flashing = it.id ? justDone.has(it.id) : false;
                            return (
                              <li key={i} className="flex items-start gap-1.5">
                                {isTask && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!task) return;
                                      const willComplete = !task.done;
                                      await toggleTask(task.id);
                                      if (willComplete) flashDone(task.id);
                                    }}
                                    aria-label={task?.done ? "Mark not done" : "Mark done"}
                                    className={cn(
                                      "group/cb mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-all",
                                      task?.done
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-primary/50 bg-background text-primary hover:bg-primary hover:text-primary-foreground",
                                      flashing && "scale-125 ring-2 ring-primary/40",
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        "h-2.5 w-2.5 transition-opacity",
                                        task?.done ? "opacity-100" : "opacity-0 group-hover/cb:opacity-100",
                                        flashing && "animate-scale-in",
                                      )}
                                    />
                                  </button>
                                )}
                                <div
                                  className={cn(
                                    "min-w-0 flex-1 transition-all",
                                    flashing && "animate-fade-in",
                                    task?.done && "opacity-60",
                                  )}
                                >
                                  <CalendarItemCard
                                    kind={it.kind}
                                    id={it.id}
                                    label={it.label}
                                    time={it.time}
                                    color={it.color}
                                    variant="compact"
                                    disabled={!interactive}
                                    onClick={interactive ? () => handleItemClick(it) : undefined}
                                    draggable={draggable}
                                    onDragStart={draggable ? (e) => {
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData(ITEM_DRAG_MIME, JSON.stringify({ sourceISO: iso, itemKind: it.kind, itemId: it.id ?? "" }));
                                      try {
                                        (window as any).__careflowAgendaDrag = { item: it, sourceISO: iso };
                                      } catch { /* noop */ }
                                    } : undefined}
                                    onDragEnd={() => {
                                      try { delete (window as any).__careflowAgendaDrag; } catch { /* noop */ }
                                    }}
                                    className={cn(task?.done && "line-through")}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {onAddForDate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 w-full gap-1.5 rounded-full"
          onClick={() => onAddForDate(format(cursor, "yyyy-MM-dd"))}
        >
          <Plus className="h-3.5 w-3.5" />
          Add for {format(cursor, "MMM d")}
        </Button>
      )}
    </div>
  );
}

export default AgendaRail;