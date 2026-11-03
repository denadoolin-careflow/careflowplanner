import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlannerView } from "@/lib/planner-prefs";

export type PlannerFace = "schedule" | "cards";

const SCOPES: Array<[PlannerView, string]> = [
  ["day", "Day"], ["week", "Week"], ["month", "Month"], ["rhythm", "Season"], ["year", "Year"],
];

/** One Day · Week · Month · Season · Year bar plus a Schedule / Cards switch, shared by every Planner screen. */
export function PlannerScopeBar({
  view, onView, face, onFace, more, className,
}: {
  view: PlannerView;
  onView: (v: PlannerView) => void;
  face: PlannerFace | null;
  onFace: (f: PlannerFace) => void;
  more?: ReactNode;
  className?: string;
}) {
  const active = view === "3day" ? "day" : view;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <nav aria-label="Planner range" className="flex min-w-0 flex-1 rounded-full bg-muted/60 p-1">
        {SCOPES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onView(id)}
            aria-current={active === id ? "page" : undefined}
            className={cn(
              "min-h-10 flex-1 rounded-full px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      {face && (
        <div role="radiogroup" aria-label="Layout" className="flex rounded-full border border-border/60 bg-card p-1">
          {(["schedule", "cards"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={face === f}
              onClick={() => onFace(f)}
              className={cn(
                "min-h-9 rounded-full px-3 text-[13px] font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                face === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      )}
      {more}
    </div>
  );
}
