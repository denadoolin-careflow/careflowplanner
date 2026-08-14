import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthPlanningDashboard } from "@/components/calendar/MonthPlanningDashboard";
import { PlannerTimeReview } from "./PlannerTimeReview";
import { startOfMonth, getDaysInMonth } from "date-fns";

/** Month planning dashboard: goals, commitments and review for the month. */
export function PlannerMonthOverview({ date, onJumpToDate }: { date: Date; onJumpToDate?: (d: Date) => void }) {
  return (
    <div className="space-y-3">
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
