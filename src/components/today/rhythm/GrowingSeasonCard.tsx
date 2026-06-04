import { Link } from "react-router-dom";
import { Sprout, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";

export function GrowingSeasonCard() {
  const { state } = useStore();
  const goals = state.goals
    .filter(g => g.status === "active")
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 3);

  return (
    <section className="cozy-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Sprout className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Growing This Season</h3>
        </div>
        <Link to="/goals" className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          View goals <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {goals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Set an active goal to grow this season.
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map(g => (
            <li key={g.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{g.title}</span>
                <span className="text-[11px] text-muted-foreground">{g.progress ?? 0}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, g.progress ?? 0))}%` }}
                />
              </div>
              {g.description && (
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{g.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}