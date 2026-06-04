import { Link } from "react-router-dom";
import { ArrowRight, Flower2 } from "lucide-react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";

export function CycleSidebarCard({ date = new Date() }: { date?: Date }) {
  const { settings, periods, loaded } = useCycle();
  if (!loaded || !settings.enabled) return null;

  const info = getPhaseInfo(date, periods, settings);

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Flower2 className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Cycle</h3>
        </div>
        <Link
          to="/health"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Open <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {!info ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Log a period to see your phase.
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl leading-none">{info.glyph}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold leading-tight text-foreground">
                {info.label} phase
              </p>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                Day {info.cycleDay} of {info.cycleLength} · {info.daysUntilNextPeriod === 0 ? "period due" : `${info.daysUntilNextPeriod}d to next`}
              </p>
            </div>
          </div>
          <p className="border-t border-border/40 pt-1.5 text-[11.5px] italic leading-snug text-foreground/80">
            {info.invitation}
          </p>
        </div>
      )}
    </section>
  );
}