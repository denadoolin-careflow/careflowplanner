import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Scope = "today" | "week" | "month";

const ROUTES: Record<Scope, string> = {
  today: "/today",
  week: "/week",
  month: "/month",
};

const LABELS: Record<Scope, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
};

/** Shared Today / Week / Month navigation pill, used across planning pages. */
export function ScopeNavToggle({ active, className }: { active: Scope; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 p-1", className)}>
      {(Object.keys(ROUTES) as Scope[]).map(scope => {
        const isActive = scope === active;
        return (
          <Button
            key={scope}
            size="sm"
            variant="ghost"
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-7 rounded-full px-3 text-xs",
              isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
            onClick={() => { if (!isActive) navigate(ROUTES[scope]); }}
          >
            {LABELS[scope]}
          </Button>
        );
      })}
    </div>
  );
}