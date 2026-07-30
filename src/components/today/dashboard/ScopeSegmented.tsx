import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const SCOPES = [
  { key: "today", label: "Today", to: "/today" },
  { key: "week", label: "Week", to: "/week" },
  { key: "month", label: "Month", to: "/month" },
] as const;

export function ScopeSegmented({ active = "today" }: { active?: "today" | "week" | "month" }) {
  const navigate = useNavigate();
  return (
    <div
      role="tablist"
      aria-label="Planning scope"
      className="inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-card/70 p-0.5 text-xs shadow-soft"
    >
      {SCOPES.map((s) => (
        <button
          key={s.key}
          role="tab"
          aria-selected={active === s.key}
          type="button"
          onClick={() => { if (active !== s.key) navigate(s.to); }}
          className={cn(
            "rounded-full px-4 py-1.5 transition-all duration-200",
            active === s.key
              ? "bg-primary/15 font-medium text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}