import { AlertTriangle, ArrowDownToLine, Scissors, MoveDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ConflictInfo {
  id: string;
  title: string;
  timeLabel: string;
}

export function ConflictPopover({
  title, conflicts, canEdit, onMoveNextFree, onShorten, onPushLater, onDismiss,
}: {
  title: string;
  conflicts: ConflictInfo[];
  canEdit: boolean;
  onMoveNextFree: () => void;
  onShorten: () => void;
  onPushLater: () => void;
  onDismiss: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Resolve scheduling conflict for ${title}`}
          className="shrink-0 rounded-full p-0.5 text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <AlertTriangle className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 space-y-2 p-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overlap</p>
          <p className="mt-0.5 text-xs font-medium leading-snug">{title}</p>
          <ul className="mt-1 space-y-0.5">
            {conflicts.map(c => (
              <li key={c.id} className="text-[11px] text-muted-foreground">
                overlaps <span className="font-medium text-foreground">{c.title}</span> · {c.timeLabel}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1">
          <Button variant="ghost" size="sm" disabled={!canEdit}
            className="h-8 w-full justify-start gap-2 text-xs" onClick={onMoveNextFree}>
            <ArrowDownToLine className="h-3.5 w-3.5" /> Move to next free slot
          </Button>
          <Button variant="ghost" size="sm" disabled={!canEdit}
            className="h-8 w-full justify-start gap-2 text-xs" onClick={onShorten}>
            <Scissors className="h-3.5 w-3.5" /> Shorten to fit
          </Button>
          <Button variant="ghost" size="sm" disabled={!canEdit}
            className="h-8 w-full justify-start gap-2 text-xs" onClick={onPushLater}>
            <MoveDown className="h-3.5 w-3.5" /> Push the later item down
          </Button>
          <Button variant="ghost" size="sm"
            className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground" onClick={onDismiss}>
            <Check className="h-3.5 w-3.5" /> Keep both
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
