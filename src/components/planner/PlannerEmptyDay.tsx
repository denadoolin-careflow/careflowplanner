import { useMemo } from "react";
import { format } from "date-fns";
import { Sparkles, Plus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { tray } from "@/lib/tray-store";

/** Guidance card shown instead of an empty grid when nothing is planned yet. */
export function PlannerEmptyDay({
  date, onPlanMyDay, onAddTask,
}: { date: Date; onPlanMyDay: () => void; onAddTask: () => void }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);

  const empty = useMemo(() => {
    if (blocks.length) return false;
    if (state.appointments.some(a => a.date === iso)) return false;
    return !state.tasks.some(t => t.dueDate === iso);
  }, [state.tasks, state.appointments, blocks, iso]);

  if (!empty) return null;

  return (
    <section className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4 text-center">
      <p className="font-display text-sm font-semibold">Nothing planned for {format(date, "EEEE")}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">Start with one of these — you can always rearrange later.</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" className="h-8 rounded-full text-xs" onClick={onPlanMyDay}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Plan my day
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={onAddTask}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add a task
        </Button>
        <Button
          size="sm" variant="outline" className="h-8 rounded-full text-xs"
          onClick={() => { tray.setTab("tray"); tray.setOpen(true); }}
        >
          <Inbox className="mr-1.5 h-3.5 w-3.5" /> Pull from tray
        </Button>
      </div>
    </section>
  );
}