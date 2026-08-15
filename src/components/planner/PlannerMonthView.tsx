import { useState } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { KIND_ICONS } from "./kindIcon";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { useCycleDots } from "@/lib/planner/day-rhythm";


/**
 * Month calendar built on the shared planner feed: real event chips per day,
 * "+N more" overflow, capacity shading and drag-to-another-day.
 */
export function PlannerMonthView({ date, onSelectDay, onOpenItem }: {
  date: Date;
  onSelectDay: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const { updateTask, updateAppointment } = useStore() as any;
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const total = differenceInCalendarDays(end, start) + 1;
  const days: Date[] = Array.from({ length: total }, (_, i) => addDays(start, i));
  const today = new Date();
  const { byDay } = usePlannerFeed(start, total);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = (it: PlannerFeedItem) => (onOpenItem ? onOpenItem(it) : openItem(it));
  const cycles = useCycleDots(days);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const todayKey = format(today, "yyyy-MM-dd");

  const onDrop = (targetISO: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const raw = e.dataTransfer.getData("application/x-planner-item") || e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [type, id] = raw.split(":");
    if (type === "task") { updateTask(id, { dueDate: targetISO }); toast.success(`Moved to ${format(new Date(`${targetISO}T12:00:00`), "MMM d")}`); }
    else if (type === "appointment") { updateAppointment(id, { date: targetISO }); toast.success("Appointment moved"); }
  };

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="grid grid-cols-7 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="px-2 py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {days.map((d, i) => {
          const key = format(d, "yyyy-MM-dd");
          const items = byDay.get(key) ?? [];
          const dim = !isSameMonth(d, date);
          const isToday = isSameDay(d, today);
          const load = Math.min(1, items.length / 6);
          const completable = items.filter(it => it.sourceRef.type === "task");
          const doneCount = completable.filter(it => it.done).length;
          const allDone = completable.length > 0 && doneCount === completable.length;
          const isPast = key < todayKey;
          const hasOverdue = isPast && completable.some(it => !it.done);
          const cyc = cycles.get(key);
          const visible = items.slice(0, 4);
          const overflow = items.slice(4);
          return (
            <div
              key={i}
              onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
              onDragLeave={() => setDragOver(cur => (cur === key ? null : cur))}
              onDrop={(e) => onDrop(key, e)}
              className={cn(
                "flex min-h-[132px] flex-col gap-0.5 border-b border-r border-border/40 p-1.5 text-left transition-colors",
                dim && "bg-muted/20 text-muted-foreground/60",
                allDone && !dim && "ring-1 ring-inset ring-emerald-500/40",
                hasOverdue && !dim && "ring-1 ring-inset ring-amber-500/40",
                dragOver === key && "bg-primary/5 ring-1 ring-inset ring-primary/50",
              )}
              style={load > 0 && !dim ? { backgroundColor: `hsl(var(--primary) / ${0.04 + load * 0.06})` } : undefined}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onSelectDay(d)}
                  aria-label={[`Open ${format(d, "EEEE, MMMM d")}`, cyc?.text].filter(Boolean).join(" · ")}
                  title={cyc?.text}
                  className="flex items-center gap-1"
                >
                  <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[11px] hover:bg-muted",
                    isToday && "bg-primary font-semibold text-primary-foreground")}>{format(d, "d")}</span>
                  {cyc && (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: cyc.color }} />
                  )}
                </button>
                {completable.length > 0 && (
                  <span
                    title={`${doneCount} of ${completable.length} complete`}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-medium",
                      allDone ? "bg-emerald-500/15 text-emerald-600"
                        : hasOverdue ? "bg-amber-500/15 text-amber-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {allDone && <Check className="h-2.5 w-2.5" />}
                    {doneCount}/{completable.length}
                  </span>
                )}
              </div>
              <div className="flex min-h-0 flex-col gap-0.5">
                {visible.map(it => {
                  const Icon = KIND_ICONS[it.kind];
                  return (
                    <button
                      key={it.id}
                      type="button"
                      draggable={it.sourceRef.type === "task" || it.sourceRef.type === "appointment"}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-planner-item", `${it.sourceRef.type}:${it.sourceRef.id}`);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => handleOpen(it)}
                      title={it.title}
                      className={cn("flex w-full items-center gap-1 rounded px-1 py-[2px] text-left text-[10px] leading-tight",
                        it.done && "line-through opacity-45")}
                      style={{ background: `${it.color}1f`, color: it.color }}
                    >
                      {it.done
                        ? <Check className="h-2.5 w-2.5 shrink-0" style={{ color: it.color }} />
                        : <Icon className="h-2.5 w-2.5 shrink-0" style={{ color: it.color }} />}
                      <span className="line-clamp-2 [overflow-wrap:anywhere] whitespace-normal">{it.time ? `${it.time} ` : ""}{it.title}</span>
                    </button>
                  );
                })}
                {overflow.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="px-1 text-left text-[9px] text-muted-foreground hover:text-foreground"
                      >
                        +{overflow.length} more
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 space-y-1 p-2">
                      <div className="px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {format(d, "EEEE, MMM d")}
                      </div>
                      {overflow.map(it => {
                        const Icon = KIND_ICONS[it.kind];
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => handleOpen(it)}
                            className={cn("flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] hover:bg-muted",
                              it.done && "line-through opacity-50")}
                          >
                            <Icon className="h-3 w-3 shrink-0" style={{ color: it.color }} />
                            <span className="line-clamp-2 [overflow-wrap:anywhere] whitespace-normal">{it.time ? `${it.time} ` : ""}{it.title}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => onSelectDay(d)}
                        className="w-full rounded-lg px-1.5 py-1 text-left text-[11px] text-primary hover:bg-muted"
                      >
                        Open day
                      </button>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
