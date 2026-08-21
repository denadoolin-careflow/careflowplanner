import { AlertTriangle, ArrowLeftRight, MoveRight } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ConflictChoice, PendingConflict } from "@/lib/planner/use-schedule-drop";

/** Shared "that time is busy" prompt for Board / List / Table drops. */
export function ScheduleConflictDialog({ pending, onCancel, onResolve }: {
  pending: PendingConflict | null;
  onCancel: () => void;
  onResolve: (choice: ConflictChoice | "anyway" | "suggested") => void;
}) {
  return (
    <AlertDialog open={!!pending} onOpenChange={o => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> That time is already busy
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pending && (
              <>
                <span className="font-medium text-foreground">{pending.title}</span> would land at{" "}
                {pending.requested}, overlapping {pending.clashes.length === 1 ? "this item" : `${pending.clashes.length} items`}:
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {pending && (
          <ul className="space-y-1.5">
            {pending.clashes.map((c, i) => (
              <li
                key={c.id ?? i}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.range}</p>
                </div>
                {c.swappable && c.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 rounded-full text-[11px]"
                    onClick={() => onResolve({ kind: "swap", withId: c.id! })}
                  >
                    <ArrowLeftRight className="mr-1 h-3 w-3" /> Swap
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="mt-0">Pick later</AlertDialogCancel>
          {pending?.suggestion && (
            <Button onClick={() => onResolve({ kind: "shift" })}>
              <MoveRight className="mr-1.5 h-3.5 w-3.5" />
              Shift to {pending.suggestion}
            </Button>
          )}
          <Button variant="secondary" onClick={() => onResolve({ kind: "anyway" })}>
            Schedule anyway
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
