import { useMemo, useState } from "react";
import { ChevronDown, HeartHandshake, Home, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { openTaskEditor } from "@/lib/open-task-editor";
import type { Task } from "@/lib/types";

const KEY = "careflow:planner:care-row";

export type CareLane = "care" | "home" | "cleaning";

const LANE_ICON = { care: HeartHandshake, home: Home, cleaning: Sparkles } as const;
const LANE_LABEL = { care: "Caregiving", home: "Home", cleaning: "Cleaning" } as const;
const LANE_CLASS = {
  care: "border-rose-300/70 bg-rose-100/60 text-rose-950 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-50",
  home: "border-sky-300/70 bg-sky-100/60 text-sky-950 dark:border-sky-800/60 dark:bg-sky-900/40 dark:text-sky-50",
  cleaning: "border-emerald-300/70 bg-emerald-100/60 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-50",
} as const;

function isCleaning(t: Task): boolean {
  const tags = (t.tags ?? []).map(x => String(x).toLowerCase());
  return tags.includes("cleaning") || tags.includes("reset") || /clean|tidy|laundry|dishes|vacuum/i.test(t.title);
}

export function laneOf(t: Task): CareLane | null {
  if (t.area === "Caregiving") return "care";
  if (t.area === "Home") return isCleaning(t) ? "cleaning" : "home";
  return isCleaning(t) ? "cleaning" : null;
}

/** Remembered show/hide for the care·home·cleaning row. */
export function useCareRowVisible(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
  });
  const toggle = () => setOn(v => {
    const next = !v;
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });
  return [on, toggle];
}

function CareChips({ iso }: { iso: string }) {
  const { state, toggleTask } = useStore() as any;
  const items = useMemo(() => {
    const out: { task: Task; lane: CareLane }[] = [];
    for (const t of (state.tasks ?? []) as Task[]) {
      if (t.dueDate !== iso) continue;
      const lane = laneOf(t);
      if (lane) out.push({ task: t, lane });
    }
    return out.sort((a, b) => a.lane.localeCompare(b.lane));
  }, [state.tasks, iso]);

  if (!items.length) {
    return <span className="block px-0.5 text-[9.5px] text-muted-foreground/60">—</span>;
  }

  return (
    <>
      {items.map(({ task, lane }) => {
        const Icon = LANE_ICON[lane];
        return (
          <div
            key={task.id}
            className={cn(
              "flex min-h-[22px] items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-tight",
              LANE_CLASS[lane],
              task.done && "opacity-50",
            )}
          >
            <button
              type="button"
              onClick={() => toggleTask(task.id)}
              aria-label={task.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
              className="shrink-0"
            >
              <Icon className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => openTaskEditor(task.id)}
              className="min-w-0 flex-1 truncate text-left"
              title={`${LANE_LABEL[lane]}: ${task.title}`}
            >
              {task.title}
            </button>
          </div>
        );
      })}
    </>
  );
}

/** Grid row of caregiving / home / cleaning tasks, one column per day. */
export function PlannerCareRow({ days, colTemplate, gutterClass, onToggle }: {
  days: string[];
  colTemplate: string;
  gutterClass?: string;
  onToggle?: () => void;
}) {
  return (
    <div className="grid border-b border-border/40 bg-background/30" style={{ gridTemplateColumns: colTemplate }}>
      <div className={cn("sticky left-0 z-30 flex flex-col items-end justify-center gap-0.5 border-r border-border/50 bg-card/95 py-1 pr-1 text-right backdrop-blur", gutterClass)}>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Care</span>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Hide caregiving, home and cleaning row"
            title="Hide care row"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
          </button>
        )}
      </div>
      {days.map((iso, i) => (
        <div key={iso} className={cn("min-w-0 space-y-0.5 px-1 py-1", i > 0 && "border-l border-border/40")}>
          <CareChips iso={iso} />
        </div>
      ))}
    </div>
  );
}

/** Single-day card used on the Today plan. */
export function PlannerCareDayCard({ date, className }: { date: Date; className?: string }) {
  const [visible, toggle] = useCareRowVisible();
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card/50 p-2", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={visible}
        className="flex w-full items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", !visible && "-rotate-90")} />
        Caregiving · Home · Cleaning
      </button>
      {visible && <div className="mt-1.5 space-y-1"><CareChips iso={iso} /></div>}
    </div>
  );
}
