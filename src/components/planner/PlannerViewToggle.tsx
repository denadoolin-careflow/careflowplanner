import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerView } from "@/lib/planner-prefs";

const OPTIONS: { id: PlannerView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "3day", label: "3 Days" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export function PlannerViewToggle({ value, onChange, className }: {
  value: PlannerView; onChange: (v: PlannerView) => void; className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5", className)}>
      {OPTIONS.map(o => {
        const active = o.id === value;
        return (
          <Button
            key={o.id}
            size="sm"
            variant="ghost"
            aria-pressed={active}
            className={cn(
              "h-7 rounded-full px-3 text-xs",
              active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
            onClick={() => { if (!active) onChange(o.id); }}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
