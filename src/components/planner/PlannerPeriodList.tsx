import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { Sunrise, Sun, Moon, Plus } from "lucide-react";
import type { PlannerPeriod } from "./PlannerPeriodTabs";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { usePlannerDropListener } from "@/lib/planner-touch-drag";

export type DayPartPeriod = "morning" | "afternoon" | "evening";

const RANGES: Record<DayPartPeriod, { start: number; end: number; label: string; Icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  morning:   { start: 5,  end: 12, label: "Morning",   Icon: Sunrise, tint: "from-amber-500/10 to-transparent" },
  afternoon: { start: 12, end: 17, label: "Afternoon", Icon: Sun,     tint: "from-sky-500/10 to-transparent" },
  evening:   { start: 17, end: 22, label: "Evening",   Icon: Moon,    tint: "from-violet-500/10 to-transparent" },
};

function hmToMin(hm?: string | null): number | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/** Time a task lands on when dropped into a day-part column. */
const DROP_HOUR: Record<DayPartPeriod, number> = { morning: 9, afternoon: 13, evening: 18 };

export function PlannerPeriodList({ date, period }: { date: Date; period: DayPartPeriod }) {
  const { state, updateTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);
  const range = RANGES[period];
  const [dragOver, setDragOver] = useState(false);
  const [draft, setDraft] = useState("");

  const dropAt = (taskId: string) => {
    const h = DROP_HOUR[period];
    void updateTask(taskId, { dueDate: iso, startTime: `${String(h).padStart(2, "0")}:00` } as any);
    haptics.snap();
  };

  usePlannerDropListener((d) => {
    if (!dragOver || !d.taskId) return;
    dropAt(d.taskId);
    setDragOver(false);
  });

  const submitDraft = async () => {
    const title = draft.trim();
    if (!title) return;
    const h = DROP_HOUR[period];
    setDraft("");
    await addTask({
      title, dueDate: iso, area: "Personal", done: false,
      startTime: `${String(h).padStart(2, "0")}:00`,
    } as any);
    haptics.success();
  };

  const items = useMemo(() => {
    const startM = range.start * 60;
    const endM = range.end * 60;
    const blockStartByTask = new Map<string, string>();
    for (const b of blocks) if (b.taskId) blockStartByTask.set(b.taskId, b.startTime);
    const arr = state.tasks
      .filter(t => t.dueDate === iso)
      .map(t => ({ t, m: hmToMin(blockStartByTask.get(t.id) ?? t.startTime) }))
      .filter(x => x.m != null && x.m! >= startM && x.m! < endM)
      .sort((a, b) => a.m! - b.m!);
    return arr;
  }, [state.tasks, blocks, iso, range.start, range.end]);

  return (
    <div
      data-droppart={period}
      data-dropdate={iso}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!dragOver) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(TASK_DRAG_MIME);
        setDragOver(false);
        if (id) { e.preventDefault(); dropAt(id); }
      }}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-colors",
        dragOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className={`flex items-center gap-2 border-b border-border/60 bg-gradient-to-r ${range.tint} px-4 py-2.5`}>
        <range.Icon className="h-4 w-4 opacity-70" />
        <div className="text-sm font-semibold">{range.label}</div>
        <div className="text-[11px] text-muted-foreground">{items.length} scheduled</div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Drop a task here, or add one below.</p>
        ) : (
          <div className="space-y-1.5">
            {items.map(({ t, m }) => (
              <div key={t.id} className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                  {formatTime(m!)}
                </span>
                <div className="min-w-0 flex-1">
                  <PlannerTaskRow task={t} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitDraft(); } }}
          placeholder={`Add to ${range.label.toLowerCase()}…`}
          aria-label={`Add a task to ${range.label}`}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-[12.5px] outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const s = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${s}` : `${h12}:${String(m).padStart(2, "0")}${s}`;
}