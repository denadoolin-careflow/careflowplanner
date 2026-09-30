import { Activity, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PlannerMoonInsight } from "./PlannerMoonInsight";
import { SolarSeasonGuide } from "./SolarSeasonGuide";
import { CyclePlanningGuide } from "./CyclePlanningGuide";
import { PlannerCapacityBar } from "./PlannerCapacityBar";

export function PlannerDayRhythm({ date, onSelectDate, className }: {
  date: Date;
  onSelectDate?: (date: Date) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const embedded = "rounded-none border-0 bg-transparent shadow-none";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("overflow-hidden rounded-xl border border-border/60 bg-card/50", className)}>
      <CollapsibleTrigger className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Activity className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[13px] font-semibold">Day rhythm</span>
          <span className="block truncate text-[11px] text-muted-foreground">Moon · season · cycle · capacity</span>
        </span>
        <PlannerCapacityBar date={date} compact className="hidden w-40 border-0 bg-transparent p-0 sm:block" />
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y divide-border/40 border-t border-border/50">
          <PlannerMoonInsight date={date} onSelectDate={onSelectDate} className={embedded} />
          <SolarSeasonGuide date={date} className={embedded} />
          <CyclePlanningGuide date={date} className={embedded} />
          <div className="p-2"><PlannerCapacityBar date={date} className="border-0 bg-transparent" /></div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}