import { Link } from "react-router-dom";
import { CalendarHeart, Sprout } from "lucide-react";
import { PhaseIcon } from "@/lib/phase-icons";
import { HORIZONS, HORIZON_LABEL, PHASE_LABEL, isSeasonReviewWindow, isWeeklyResetDay, phaseFor, seasonFor, SEASON_LABEL } from "@/lib/rhythm/horizons";

/** Where you are in each of the five timeframes; tap to open the Planner Rhythm view. */
export function HorizonStrip({ date }: { date: Date }) {
  return (
    <nav aria-label="Your rhythm across timeframes" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-2">
        {HORIZONS.map(h => {
          const p = phaseFor(h, h === "day" ? new Date() : date);
          return (
            <li key={h}>
              <Link to={`/planner?range=rhythm&horizon=${h}`}
                className="flex min-h-[40px] items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <PhaseIcon phase={p} size="sm" />
                <span className="text-muted-foreground">{HORIZON_LABEL[h]}:</span>
                <span className="font-semibold" style={{ color: `hsl(var(--rhythm-${p}-deep))` }}>{PHASE_LABEL[p]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Sunday reset + season review nudges for the Gentle reminders bar. Renders nothing otherwise. */
export function RhythmReviewReminders({ date }: { date: Date }) {
  const sunday = isWeeklyResetDay(date);
  const season = isSeasonReviewWindow(date);
  if (!sunday && !season) return null;
  return (
    <>
      {sunday && (
        <Link to="/planner?range=rhythm&horizon=week&review=1" className="flex min-h-11 items-center gap-2 rounded-xl border bg-card p-3 text-sm">
          <CalendarHeart className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--rhythm-letgo-deep))" }} aria-hidden />
          <span className="flex-1"><b>Sunday weekly reset</b> — let go of this week and plan the next.</span>
        </Link>
      )}
      {season && (
        <Link to="/planner?range=rhythm&horizon=season&review=1" className="flex min-h-11 items-center gap-2 rounded-xl border bg-card p-3 text-sm">
          <Sprout className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--rhythm-plan-deep))" }} aria-hidden />
          <span className="flex-1"><b>Season review</b> — close {SEASON_LABEL[seasonFor(date).season]} and set intentions.</span>
        </Link>
      )}
    </>
  );
}
