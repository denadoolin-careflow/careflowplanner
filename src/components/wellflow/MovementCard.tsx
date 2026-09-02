/** This week's movement: days moved against your plan, recent sessions, energy comparison. */
import { format } from "date-fns";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  activityLabel, deleteMovement, useMovementEnergy, useMovementWeek,
} from "@/lib/wellflow/movement";

export function MovementCard({
  targetDays = 3, onLog, compact,
}: {
  targetDays?: number;
  onLog: () => void;
  compact?: boolean;
}) {
  const { logs, week, loading } = useMovementWeek(targetDays);
  const energy = useMovementEnergy(60);

  const pct = targetDays > 0 ? Math.min(100, (week.daysMoved / targetDays) * 100) : week.daysMoved > 0 ? 100 : 0;

  return (
    <SectionCard
      title="Movement"
      subtitle="This week, next to what your plan aims for"
      accent="sage"
      action={
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onLog}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Log
        </Button>
      }
    >
      {loading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm">
              <span className="text-lg font-semibold tabular-nums">{week.daysMoved}</span>
              <span className="text-muted-foreground"> / {targetDays} days · {Math.round(week.minutes)} min</span>
            </p>
            {week.streak > 1 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium">
                {week.streak}-day streak
              </span>
            )}
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="mt-3 flex justify-between gap-1">
            {week.strip.map(d => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn("h-8 w-full rounded-lg border",
                    d.moved ? "border-primary/40 bg-primary/25" : "border-border/40 bg-muted/30")}
                  title={`${d.date}: ${d.minutes} min`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(`${d.date}T12:00:00`), "EEEEE")}
                </span>
              </div>
            ))}
          </div>

          {energy && energy.movedEnergy != null && energy.stillEnergy != null && (
            <p className="mt-3 rounded-2xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              On days you logged movement your energy check-ins averaged{" "}
              <span className="font-medium text-foreground">{energy.movedEnergy.toFixed(1)}</span>, compared with{" "}
              <span className="font-medium text-foreground">{energy.stillEnergy.toFixed(1)}</span> on other days.
            </p>
          )}

          {!compact && (
            logs.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="Nothing logged yet" hint="Log a walk and this fills in." />
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {logs.slice(0, 6).map(l => (
                  <li key={l.id} className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                    <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {activityLabel(l.activity)} · {l.minutes} min
                      <span className="text-muted-foreground"> · {format(new Date(`${l.date}T12:00:00`), "MMM d")}</span>
                    </span>
                    <button
                      type="button" aria-label={`Delete ${activityLabel(l.activity)}`}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                      onClick={async () => { await deleteMovement(l.id); toast.success("Entry removed"); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}
    </SectionCard>
  );
}
