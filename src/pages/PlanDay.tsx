import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays, format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { DailyPlanningDashboard } from "@/components/calendar/DailyPlanningDashboard";

export default function PlanDay() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const day = useMemo(() => {
    if (!date) return new Date();
    const d = parseISO(date);
    return isValid(d) ? d : new Date();
  }, [date]);

  const go = (d: Date) => navigate(`/plan/${format(d, "yyyy-MM-dd")}`);

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-calm flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily plan</p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{format(day, "EEEE, MMMM d, yyyy")}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => go(addDays(day, -1))} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DayPickerButton date={day} onChange={go} />
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => go(addDays(day, 1))} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => navigate("/plan")}>
              <CalendarDays className="mr-1 h-3.5 w-3.5" /> All plans
            </Button>
          </div>
        </div>
      </div>

      <DailyPlanningDashboard day={day} />
    </div>
  );
}