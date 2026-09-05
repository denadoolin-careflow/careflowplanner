import { useEffect, useState } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { Check, LayoutGrid, List, Rows3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { KIND_ICONS } from "./kindIcon";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { useCycleDots } from "@/lib/planner/day-rhythm";
import { useIsMobile } from "@/hooks/use-mobile";
import { ViewPills } from "@/components/layout/ViewPills";
import { useTouchDrag } from "@/lib/planner/touch-drag";

/** Mobile-only layout choices for the month grid. */
type MobileMonthView = "dots" | "chips" | "list";
const MOBILE_VIEW_KEY = "careflow:month-mobile-view:v1";
const MOBILE_VIEW_ITEMS = [
  { value: "dots" as const, label: "Dots", icon: LayoutGrid },
  { value: "chips" as const, label: "Chips", icon: Rows3 },
  { value: "list" as const, label: "List", icon: List },
];


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
  const isMobile = useIsMobile();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const todayKey = format(today, "yyyy-MM-dd");

  const [mobileView, setMobileView] = useState<MobileMonthView>("dots");
  useEffect(() => {
    try {
      const v = localStorage.getItem(MOBILE_VIEW_KEY);
      if (v === "dots" || v === "chips" || v === "list") setMobileView(v);
    } catch { /* ignore */ }
  }, []);
  const pickMobileView = (v: MobileMonthView) => {
    setMobileView(v);
    try { localStorage.setItem(MOBILE_VIEW_KEY, v); } catch { /* ignore */ }
  };

  const move = (type: string, id: string, targetISO: string) => {
    if (type === "task") { updateTask(id, { dueDate: targetISO }); toast.success(`Moved to ${format(new Date(`${targetISO}T12:00:00`), "MMM d")}`); }
    else if (type === "appointment") { updateAppointment(id, { date: targetISO }); toast.success("Appointment moved"); }
  };

  const touch = useTouchDrag((p, dayISO) => move(p.type, p.id, dayISO));

  const onDrop = (targetISO: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const raw = e.dataTransfer.getData("application/x-planner-item") || e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [type, id] = raw.split(":");
    move(type, id, targetISO);
  };

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-border/60 bg-card/90 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className={cn("py-1.5", isMobile ? "text-center" : "px-2")}>{isMobile ? d.slice(0, 1) : d}</div>
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
              data-drop-day={key}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(key); }}
              onDragLeave={() => setDragOver(cur => (cur === key ? null : cur))}
              onDrop={(e) => onDrop(key, e)}
              className={cn(
                "flex flex-col border-b border-r border-border/40 text-left transition-colors",
                isMobile ? "min-h-[62px] gap-0 p-1" : "min-h-[132px] gap-0.5 p-1.5",
                dim && "bg-muted/20 text-muted-foreground/60",
                allDone && !dim && "ring-1 ring-inset ring-emerald-500/40",
                hasOverdue && !dim && "ring-1 ring-inset ring-amber-500/40",
                (dragOver === key || touch.overDay === key) && "bg-primary/5 ring-1 ring-inset ring-primary/50",
              )}
              style={load > 0 && !dim ? { backgroundColor: `hsl(var(--primary) / ${0.04 + load * 0.06})` } : undefined}
            >
              <div className={cn("flex items-center gap-1", isMobile ? "justify-center" : "justify-between")}>
                <button
                  type="button"
                  onClick={() => onSelectDay(d)}
                  aria-label={[`Open ${format(d, "EEEE, MMMM d")}`, cyc?.text].filter(Boolean).join(" · ")}
                  title={cyc?.text}
                  className="flex items-center gap-1"
                >
                  <span className={cn("grid place-items-center rounded-full hover:bg-muted",
                    isMobile ? "h-6 w-6 text-[12px]" : "h-6 w-6 text-[11px]",
                    isToday && "bg-primary font-semibold text-primary-foreground")}>{format(d, "d")}</span>
                  {cyc && (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: cyc.color }} />
                  )}
                </button>
                {completable.length > 0 && !isMobile && (
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
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => onSelectDay(d)}
                  aria-label={`Open ${format(d, "EEEE, MMMM d")}${items.length ? ` — ${items.length} planned` : ""}`}
                  className="flex min-h-0 flex-1 flex-col items-center justify-start gap-1 pt-1"
                >
                  <span className="flex items-center justify-center gap-[3px]">
                    {items.slice(0, 4).map(it => (
                      <span
                        key={it.id}
                        aria-hidden
                        className={cn("h-1.5 w-1.5 rounded-full", it.done && "opacity-40")}
                        style={{ background: it.color }}
                      />
                    ))}
                  </span>
                  {items.length > 4 && (
                    <span className="text-[9px] leading-none text-muted-foreground">+{items.length - 4}</span>
                  )}
                  {completable.length > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1 text-[9px] font-medium leading-[14px]",
                        allDone ? "bg-emerald-500/15 text-emerald-600"
                          : hasOverdue ? "bg-amber-500/15 text-amber-700"
                          : "text-muted-foreground",
                      )}
                    >
                      {doneCount}/{completable.length}
                    </span>
                  )}
                </button>
              ) : (
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
                        it.done && "opacity-55")}
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
                              it.done && "opacity-55")}
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
              )}
            </div>
          );
        })}
      </div>
      {dialogs}
    </div>
  );
}
