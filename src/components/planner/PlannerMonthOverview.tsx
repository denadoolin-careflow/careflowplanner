import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthPlanningDashboard } from "@/components/calendar/MonthPlanningDashboard";
import { PlannerTimeReview } from "./PlannerTimeReview";
import { SeasonBanner } from "@/components/seasons/SeasonBanner";
import { startOfMonth, getDaysInMonth } from "date-fns";
import { PeriodNoteDot } from "@/components/notes/PeriodNoteDot";
import { usePeriodNoteMarks } from "@/lib/notes/daily";
import { monthKeyFor } from "@/lib/notes/periods";

/** Month planning dashboard: goals, commitments and review for the month. */
export function PlannerMonthOverview({ date, onJumpToDate }: { date: Date; onJumpToDate?: (d: Date) => void }) {
  const monthKey = monthKeyFor(date);
  const monthMarks = usePeriodNoteMarks("monthly", [monthKey]);
  return (
    <div className="space-y-3">
      <SeasonBanner date={date} compact linkTo="/month/overview" />
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{format(date, "MMMM yyyy")}</span>
        <PeriodNoteDot kind="monthly" keyISO={monthKey} mark={monthMarks.get(monthKey)} showLabel />
      </div>
      <PlannerTimeReview from={startOfMonth(date)} days={getDaysInMonth(date)} label="this month" />
      <MonthPlanningDashboard cursor={date} onJumpToDate={onJumpToDate} />
      <div className="flex justify-end">
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-full text-xs">
          <Link to="/month/overview">
            Full {format(date, "MMMM")} plan <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
