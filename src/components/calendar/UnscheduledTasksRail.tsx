import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Inbox, GripVertical, Search, X, CalendarDays, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { format, parseISO, isAfter, startOfDay, addDays } from "date-fns";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";

export const TASK_DRAG_MIME = "application/x-careflow-task";
export const EVENT_DRAG_MIME = "application/x-careflow-event";

export function UnscheduledTasksRail() {
  const { state } = useStore();
  const [tab, setTab] = useState<"tasks" | "calendar">("tasks");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"unscheduled" | "all">("unscheduled");
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  useEffect(() => {
    if (tab !== "calendar") return;
    gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {});
  }, [tab]);

  const tasks = useMemo(() => {
    const root = state.tasks.filter(t => !t.done && !t.parentTaskId);
    const filtered = scope === "unscheduled" ? root.filter(t => !t.dueDate) : root;
    const term = q.trim().toLowerCase();
    const list = term ? filtered.filter(t => t.title.toLowerCase().includes(term)) : filtered;
    return list.slice(0, 200);
  }, [state.tasks, q, scope]);

  const onDragStart = (e: React.DragEvent, t: Task) => {
    e.dataTransfer.setData(TASK_DRAG_MIME, t.id);
    e.dataTransfer.setData("text/plain", t.title);
    e.dataTransfer.effectAllowed = "move";
  };

  // Calendar tab events
  const today = startOfDay(new Date());
  const horizon = addDays(today, 30);
  const upcomingEvents = useMemo(() => {
    const items: { date: string; time?: string; label: string; kind: "appt" | "bday" | "hol" | "gcal" | "task"; taskId?: string }[] = [];
    for (const a of state.appointments) items.push({ date: a.date, time: a.time, label: a.title, kind: "appt" });
    for (const b of state.birthdays) items.push({ date: b.date, label: `🎂 ${b.name}`, kind: "bday" });
    for (const h of state.holidays) items.push({ date: h.date, label: `✨ ${h.name}`, kind: "hol" });
    for (const g of gEvents) items.push({ date: g.date, time: g.time ?? undefined, label: g.title, kind: "gcal" });
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || !t.dueDate) continue;
      items.push({ date: t.dueDate, label: `○ ${t.title}`, kind: "task", taskId: t.id });
    }
    return items
      .filter(i => {
        try { const d = parseISO(i.date); return !isAfter(today, d) && !isAfter(d, horizon); } catch { return false; }
      })
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  }, [state.appointments, state.birthdays, state.holidays, state.tasks, gEvents, today, horizon]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, typeof upcomingEvents>();
    for (const ev of upcomingEvents) {
      const arr = m.get(ev.date) ?? [];
      arr.push(ev);
      m.set(ev.date, arr);
    }
    return Array.from(m.entries());
  }, [upcomingEvents]);

  const kindClass = (k: string) =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground"
    : "bg-muted text-foreground";

  const onEventDragStart = (e: React.DragEvent, ev: { label: string; kind: string; taskId?: string }) => {
    if (ev.taskId) e.dataTransfer.setData(TASK_DRAG_MIME, ev.taskId);
    const color = ev.kind === "bday" ? "accent" : ev.kind === "hol" ? "secondary" : ev.kind === "task" ? "warm" : "primary";
    e.dataTransfer.setData(EVENT_DRAG_MIME, JSON.stringify({ title: ev.label, color }));
    e.dataTransfer.setData("text/plain", ev.label);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="hidden xl:flex sticky top-20 max-h-[calc(100vh-6rem)] w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-soft">
      <div className="flex items-center gap-1 border-b border-border/60 p-1.5">
        <button
          onClick={() => setTab("tasks")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
            tab === "tasks" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListTodo className="h-3.5 w-3.5" /> Tasks
        </button>
        <button
          onClick={() => setTab("calendar")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
            tab === "calendar" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Calendar
        </button>
      </div>

      {tab === "tasks" && (
      <>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Inbox className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-none">Unscheduled</div>
          <div className="mt-0.5 text-[10.5px] text-muted-foreground">Drag onto any day or time slot</div>
        </div>
      </div>

      <div className="flex gap-1 px-3 pt-2.5">
        {(["unscheduled","all"] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
              scope === s ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "unscheduled" ? "No date" : "All open"}
          </button>
        ))}
      </div>

      <div className="relative px-3 pb-2 pt-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="h-8 pl-7 pr-7 text-xs"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {tasks.length === 0 ? (
          <div className="m-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            Nothing waiting. Capture something with Quick Add.
          </div>
        ) : (
          <ul className="space-y-1">
            {tasks.map(t => {
              const project = t.projectId ? state.projects?.find(p => p.id === t.projectId) : undefined;
              return (
                <li
                  key={t.id}
                  draggable
                  onDragStart={e => onDragStart(e, t)}
                  className={cn(
                    "group flex cursor-grab items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs",
                    "hover:border-border/60 hover:bg-muted/40 active:cursor-grabbing",
                  )}
                  title={t.title}
                >
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium leading-snug">{t.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {project && (
                        <span className="truncate" style={project.color ? { color: project.color } : undefined}>
                          {project.name}
                        </span>
                      )}
                      {project && t.area && <span>·</span>}
                      {t.area && <span className="truncate">{t.area}</span>}
                      {t.dueDate && <span className="ml-auto shrink-0">{t.dueDate.slice(5)}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </>
      )}

      {tab === "calendar" && (
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {eventsByDay.length === 0 ? (
          <div className="m-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No events in the next 30 days.
          </div>
        ) : (
          <ul className="space-y-3">
            {eventsByDay.map(([date, evs]) => (
              <li key={date}>
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(parseISO(date), "EEE, MMM d")}
                </div>
                <ul className="space-y-1">
                  {evs.map((ev, i) => (
                    <li
                      key={i}
                      draggable
                      onDragStart={e => onEventDragStart(e, ev)}
                      className={cn(
                        "group flex cursor-grab items-start gap-2 rounded-lg px-2 py-1.5 text-xs active:cursor-grabbing",
                        kindClass(ev.kind),
                      )}
                      title="Drag onto a time slot to schedule"
                    >
                      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                      {ev.time && <span className="shrink-0 font-mono text-[10px] opacity-70">{ev.time.slice(0,5)}</span>}
                      <span className="min-w-0 flex-1 truncate">{ev.label}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </aside>
  );
}