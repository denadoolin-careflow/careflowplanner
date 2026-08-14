import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { PlannerAssistantPanel } from "./PlannerAssistantPanel";
import type { BusyRange } from "@/lib/planner/schedule-assistant";

function hmToMin(v?: string | null): number | null {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}
const minToHm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Wires the scheduling assistant to the day's real tasks, blocks and appointments. */
export function PlannerDayAssistant({ date, className }: { date: Date; className?: string }) {
  const { state, updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);

  const blockTaskIds = useMemo(
    () => new Set(blocks.filter(b => b.taskId).map(b => b.taskId as string)),
    [blocks],
  );

  const busy = useMemo<BusyRange[]>(() => {
    const out: BusyRange[] = [];
    for (const b of blocks) {
      const s = hmToMin(b.startTime); if (s === null) continue;
      const e = hmToMin(b.endTime) ?? s + 30;
      out.push({ start: s, end: Math.max(s + 15, e), title: b.title ?? undefined, kind: "block" });
    }
    for (const t of state.tasks) {
      if (t.dueDate !== iso || t.done || blockTaskIds.has(t.id)) continue;
      const s = hmToMin(t.startTime); if (s === null) continue;
      out.push({ start: s, end: s + (t.estMinutes ?? 30), title: t.title, kind: "task" });
    }
    for (const a of state.appointments) {
      if (a.date !== iso) continue;
      const s = hmToMin(a.time); if (s === null) continue;
      const e = hmToMin(a.endTime) ?? s + 30;
      out.push({ start: s, end: Math.max(s + 15, e), title: a.title, kind: "appointment" });
    }
    return out.sort((x, y) => x.start - y.start);
  }, [blocks, blockTaskIds, state.tasks, state.appointments, iso]);

  const unscheduled = useMemo(
    () => state.tasks.filter(t => t.dueDate === iso && !t.done && !t.startTime && !blockTaskIds.has(t.id)),
    [state.tasks, iso, blockTaskIds],
  );

  const onPlace = useCallback(async (taskId: string, absMin: number) => {
    const prev = state.tasks.find(t => t.id === taskId)?.startTime ?? null;
    await updateTask(taskId, { startTime: minToHm(absMin) } as any);
    toast.success(`Scheduled for ${minToHm(absMin)}`, {
      action: { label: "Undo", onClick: () => { void updateTask(taskId, { startTime: prev } as any); } },
    });
  }, [state.tasks, updateTask]);

  return (
    <PlannerAssistantPanel
      date={date}
      unscheduled={unscheduled}
      busy={busy}
      onPlace={onPlace}
      className={className}
    />
  );
}
