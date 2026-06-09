import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/today", label: "Today" },
  { to: "/week",  label: "Week"  },
  { to: "/month", label: "Month" },
];

/**
 * Persistent Today / Week / Month switcher.
 * Larger tap targets on mobile, compact on desktop.
 */
export function PeriodNav({ className }: { className?: string }) {
  return (
    <nav
      role="tablist"
      aria-label="Time period"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1 text-xs font-medium backdrop-blur sm:w-fit",
        className,
      )}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          role="tab"
          className={({ isActive }) => cn(
            "flex-1 sm:flex-none rounded-full px-4 py-2 text-center transition-colors min-h-[40px] flex items-center justify-center sm:min-h-0 sm:px-3 sm:py-1.5",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export const PERIOD_ROUTES = TABS.map((t) => t.to);