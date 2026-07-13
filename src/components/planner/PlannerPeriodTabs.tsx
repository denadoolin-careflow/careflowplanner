import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sunrise, Sun, Moon, LayoutGrid } from "lucide-react";

export type PlannerPeriod = "grid" | "morning" | "afternoon" | "evening";

const KEY = "careflow:planner:period";

export function usePlannerPeriod(): [PlannerPeriod, (p: PlannerPeriod) => void] {
  const [p, setP] = useState<PlannerPeriod>(() => {
    try { return (localStorage.getItem(KEY) as PlannerPeriod) || "grid"; } catch { return "grid"; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, p); } catch {} }, [p]);
  return [p, setP];
}

const OPTIONS: { id: PlannerPeriod; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "grid", label: "Grid", Icon: LayoutGrid },
  { id: "morning", label: "Morning", Icon: Sunrise },
  { id: "afternoon", label: "Afternoon", Icon: Sun },
  { id: "evening", label: "Evening", Icon: Moon },
];

export function PlannerPeriodTabs({ value, onChange, className }: {
  value: PlannerPeriod; onChange: (v: PlannerPeriod) => void; className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5", className)}>
      {OPTIONS.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.Icon className="h-3 w-3" />{o.label}
          </button>
        );
      })}
    </div>
  );
}