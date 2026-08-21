import { AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PendingConflict } from "@/lib/planner/use-schedule-drop";

/** Shared "that time is busy" prompt for Board / List / Table drops. */
export function ScheduleConflictDialog({ pending, onCancel, onResolve }: {
  pending: PendingConflict | null;
  onCancel: () => void;
  onResolve: (choice: "anyway" | "suggested") => void;
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
                {pending.requested}, overlapping <span className="font-medium text-foreground">{pending.clashTitle}</span>{" "}
                ({pending.clashRange}).
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Pick later</AlertDialogCancel>
          {pending?.suggestion && (
            <AlertDialogAction onClick={() => onResolve("suggested")}>
              Use {pending.suggestion} instead
            </AlertDialogAction>
          )}
          <AlertDialogAction
            onClick={() => onResolve("anyway")}
            className="bg-muted text-foreground hover:bg-muted/80"
          >
            Schedule anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
