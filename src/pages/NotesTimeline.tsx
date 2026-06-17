import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, BookHeart, CalendarClock, CheckCircle2, FileText, Filter as FilterIcon } from "lucide-react";
import { listNotes, type Note } from "@/lib/notes";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type ItemType = "note" | "journal" | "task" | "event";
type TimelineItem = {
  id: string;
  type: ItemType;
  date: string; // ISO date
  title: string;
  body?: string;
  href?: string;
  badge?: string;
};

const TYPE_META: Record<ItemType, { label: string; icon: any; accent: string }> = {
  note: { label: "Note", icon: FileText, accent: "text-sky-500" },
  journal: { label: "Journal", icon: BookHeart, accent: "text-amber-500" },
  task: { label: "Task", icon: CheckCircle2, accent: "text-emerald-500" },
  event: { label: "Event", icon: CalendarClock, accent: "text-violet-500" },
};

const ALL_TYPES: ItemType[] = ["note", "journal", "task", "event"];

export default function NotesTimeline() {
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [enabled, setEnabled] = useState<Set<ItemType>>(new Set(ALL_TYPES));

  useEffect(() => {
    listNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    if (enabled.has("note")) {
      for (const n of notes) {
        out.push({
          id: `note-${n.id}`,
          type: "note",
          date: n.updatedAt,
          title: n.title || "Untitled note",
          body: n.body?.slice(0, 240),
          href: `/notes/${n.id}`,
        });
      }
    }
    if (enabled.has("journal")) {
      for (const j of state.journal) {
        out.push({
          id: `journal-${j.id}`,
          type: "journal",
          date: j.date,
          title: j.title || (j as any).template || j.type || "Journal entry",
          body: String(j.body ?? "").slice(0, 240),
          href: "/journal",
          badge: (j as any).mood,
        });
      }
    }
    if (enabled.has("task")) {
      for (const t of state.tasks) {
        const when = t.lastCompletedAt ?? t.dueDate ?? t.createdAt;
        if (!when) continue;
        out.push({
          id: `task-${t.id}`,
          type: "task",
          date: when,
          title: t.title,
          body: t.notes ?? undefined,
          href: `/tasks/${t.id}`,
          badge: t.done ? "done" : t.priority,
        });
      }
    }
    if (enabled.has("event")) {
      for (const a of state.appointments) {
        if (!a.startDate) continue;
        out.push({
          id: `event-${a.id}`,
          type: "event",
          date: `${a.startDate}T${a.startTime ?? "09:00"}`,
          title: a.title,
          body: a.notes ?? undefined,
          href: "/calendar",
        });
      }
    }
    return out.sort((x, y) => (y.date > x.date ? 1 : -1));
  }, [notes, state.journal, state.tasks, state.appointments, enabled]);

  // Group by yyyy-mm-dd
  const groups = useMemo(() => {
    const m = new Map<string, TimelineItem[]>();
    for (const it of items) {
      const day = it.date.slice(0, 10);
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(it);
    }
    return Array.from(m.entries());
  }, [items]);

  const toggle = (t: ItemType) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      if (next.size === 0) return new Set(ALL_TYPES);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/notes"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Notes
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Notes, journal entries, tasks, and events — woven by time.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 p-1">
          <FilterIcon className="ml-2 h-3 w-3 text-muted-foreground" />
          {ALL_TYPES.map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            const active = enabled.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="h-3 w-3" /> {meta.label}
              </button>
            );
          })}
        </div>
      </header>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet to weave together.</p>
      ) : (
        <ul className="space-y-6">
          {groups.map(([day, list]) => (
            <li key={day}>
              <div className="sticky top-16 z-[1] mb-2 inline-flex items-baseline gap-2 rounded bg-background/85 px-1 py-0.5 backdrop-blur">
                <span className="font-display text-sm font-semibold">
                  {format(parseISO(day + "T00:00:00"), "EEEE, MMM d, yyyy")}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {list.length} {list.length === 1 ? "item" : "items"}
                </span>
              </div>
              <ul className="relative ml-3 space-y-2 border-l-2 border-border/40 pl-4">
                {list.map((it) => {
                  const meta = TYPE_META[it.type];
                  const Icon = meta.icon;
                  const Inner = (
                    <div className="cozy-card flex gap-3 p-3">
                      <span className={cn("mt-0.5 shrink-0", meta.accent)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {meta.label}
                          </span>
                          {it.badge && (
                            <span className="text-[10px] text-muted-foreground">{it.badge}</span>
                          )}
                        </div>
                        <div className="truncate text-sm font-medium text-foreground">
                          {it.title}
                        </div>
                        {it.body && (
                          <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            {it.body}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                  return (
                    <li key={it.id} className="relative">
                      <span className="absolute -left-[1.4rem] top-4 h-2 w-2 rounded-full bg-border" />
                      {it.href ? <Link to={it.href}>{Inner}</Link> : Inner}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}