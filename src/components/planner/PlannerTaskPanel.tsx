import { useMemo, useState } from "react";
import { Search, Plus, ChevronRight, Inbox as InboxIcon, Sun, CalendarClock, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import type { Task } from "@/lib/types";
import { AREAS } from "@/lib/types";

type SortKey = "smart" | "due" | "priority" | "title";

interface Section {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  match: (t: Task) => boolean;
  defaultOpen?: boolean;
}

const AREA_SET = new Set(["Family","Health","Home","Meals","Personal","Money","Caregiving","Kids","Appointments","Creative Projects","Holidays & Birthdays"]);

export function PlannerTaskPanel({ selectedDate, onQuickAdd }: { selectedDate: Date; onQuickAdd: () => void }) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("smart");
  const [open, setOpen] = useState<Record<string, boolean>>({
    inbox: true, today: true, upcoming: false, someday: false,
  });

  const today = startOfDay(selectedDate);
  const todayISO = format(today, "yyyy-MM-dd");

  const tasks = useMemo(() => {
    const base = state.tasks.filter(t => !t.done && !t.parentTaskId);
    const filtered = q ? base.filter(t => t.title.toLowerCase().includes(q.toLowerCase())) : base;
    return sortTasks(filtered, sort);
  }, [state.tasks, q, sort]);

  const sections: Section[] = [
    { id: "inbox", label: "Inbox", Icon: InboxIcon, match: (t) => !!t.inbox || (t.status === "active" && !t.dueDate && !t.startTime), defaultOpen: true },
    { id: "today", label: "Today", Icon: Sun, match: (t) => !!t.dueDate && isSameDay(parseISO(t.dueDate), today), defaultOpen: true },
    { id: "upcoming", label: "Upcoming", Icon: CalendarClock, match: (t) => !!t.dueDate && isAfter(parseISO(t.dueDate), today) },
    { id: "someday", label: "Someday", Icon: Moon, match: (t) => t.status === "someday" },
  ];

  const usedIds = new Set<string>();
  const grouped = sections.map(s => {
    const rows = tasks.filter(t => { if (usedIds.has(t.id)) return false; if (s.match(t)) { usedIds.add(t.id); return true; } return false; });
    return { ...s, rows };
  });

  // Area groups from remaining tasks
  const remaining = tasks.filter(t => !usedIds.has(t.id));
  const areaGroups = AREAS.filter(a => AREA_SET.has(a)).map(area => ({
    id: `area:${area}`,
    label: area,
    rows: remaining.filter(t => t.area === area),
  })).filter(g => g.rows.length > 0);

  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <header className="border-b border-border/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-wide">Tasks</h2>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onQuickAdd} aria-label="Quick add task">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="h-8 pl-7 text-xs" />
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px]">
          {(["smart","due","priority","title"] as SortKey[]).map(k => (
            <button key={k} onClick={() => setSort(k)}
              className={cn("rounded-full px-2 py-0.5 uppercase tracking-wide transition-colors",
                sort === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}>
              {k}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {grouped.map(g => (
          <SectionBlock key={g.id} id={g.id} label={g.label} Icon={g.Icon} count={g.rows.length}
            open={open[g.id] ?? g.defaultOpen ?? false} onToggle={toggle}>
            {g.rows.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">Nothing here.</p>
            ) : g.rows.map(t => <PlannerTaskRow key={t.id} task={t} />)}
          </SectionBlock>
        ))}
        {areaGroups.length > 0 && (
          <div className="mt-3 border-t border-border/50 pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Areas</p>
            {areaGroups.map(g => (
              <SectionBlock key={g.id} id={g.id} label={g.label} count={g.rows.length}
                open={open[g.id] ?? false} onToggle={toggle}>
                {g.rows.map(t => <PlannerTaskRow key={t.id} task={t} />)}
              </SectionBlock>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function SectionBlock({ id, label, Icon, count, open, onToggle, children }: {
  id: string; label: string; Icon?: React.ComponentType<{ className?: string }>;
  count: number; open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-semibold text-foreground/90 hover:bg-muted/60"
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
        <span className="flex-1 truncate">{label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">{count}</span>
      </button>
      {open && <div className="ml-1 space-y-1 py-1">{children}</div>}
    </div>
  );
}

function sortTasks(tasks: Task[], sort: SortKey): Task[] {
  const arr = tasks.slice();
  const PRI: Record<string, number> = { high: 0, medium: 1, low: 2 };
  switch (sort) {
    case "due":
      return arr.sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"));
    case "priority":
      return arr.sort((a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3));
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return arr.sort((a, b) => {
        const ap = a.isTopThree ? 0 : 1, bp = b.isTopThree ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3);
      });
  }
}