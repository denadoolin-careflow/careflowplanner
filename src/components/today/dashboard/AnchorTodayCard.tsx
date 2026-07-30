import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useBurnoutCheckIn } from "@/lib/burnout-checkin";
import { Anchor, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard, EmptyLine } from "./DashCard";

/** The single task that holds the day — the MVD task, else the first top-three. */
export function AnchorTodayCard({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  const { state, toggleTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { entry, setMvdTaskId } = useBurnoutCheckIn(date);

  const anchor = useMemo(() => {
    const byId = entry.mvdTaskId ? state.tasks.find(t => t.id === entry.mvdTaskId) : null;
    if (byId) return byId;
    return state.tasks.find(t => !t.done && t.isTopThree)
      ?? state.tasks.find(t => !t.done && t.dueDate === iso)
      ?? null;
  }, [state.tasks, entry.mvdTaskId, iso]);

  const candidates = useMemo(
    () => state.tasks.filter(t => !t.done && t.dueDate === iso).slice(0, 5),
    [state.tasks, iso],
  );

  return (
    <DashCard eyebrow="Anchor" title="Today's anchor" className="scroll-mt-24">
      <div id="anchor" />
      {anchor ? (
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => void toggleTask(anchor.id)}
            aria-label={anchor.done ? "Mark anchor not done" : "Mark anchor done"}
            className={cn(
              "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
              anchor.done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-care-anchor/60 text-transparent hover:bg-care-anchor-soft",
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onTaskClick?.(anchor.id)}
              className={cn("text-left text-sm font-medium [overflow-wrap:anywhere] hover:underline", anchor.done && "text-muted-foreground line-through")}
            >
              {anchor.title}
            </button>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <Anchor className="mr-1 inline h-3 w-3" aria-hidden />
              If only this happens, today still counts.
            </p>
          </div>
        </div>
      ) : (
        <EmptyLine>Nothing anchored yet. Pick one thing that would make today feel done.</EmptyLine>
      )}
      {candidates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidates.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMvdTaskId(t.id)}
              className={cn(
                "max-w-[14rem] truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                anchor?.id === t.id
                  ? "border-care-anchor/60 bg-care-anchor-soft text-care-anchor"
                  : "border-border/50 text-muted-foreground hover:bg-muted/50",
              )}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
    </DashCard>
  );
}