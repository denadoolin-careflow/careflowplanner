import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Small pill row for the mode within a range (Grid/Board, Calendar/Overview). */
export function PlannerRangeModeTabs<T extends string>({ value, onChange, options, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5", className)}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <Button
            key={o.id}
            size="sm"
            variant="ghost"
            aria-pressed={active}
            className={cn("h-7 rounded-full px-3 text-xs",
              active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
            onClick={() => { if (!active) onChange(o.id); }}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
