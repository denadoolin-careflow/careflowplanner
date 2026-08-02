import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerScheduleList } from "@/components/planner/PlannerScheduleList";
import { PlannerPeriodList } from "@/components/planner/PlannerPeriodList";
import { PlannerPeriodTabs, usePlannerPeriod } from "@/components/planner/PlannerPeriodTabs";
import { TaskSourcePanel } from "@/components/planner/TaskSourcePanel";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCapacity } from "@/components/today/dashboard/capacity-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { Leaf, Sparkles, ListTodo, Inbox } from "lucide-react";
import { tray, useTray } from "@/lib/tray-store";

/**
 * Today's planning surface — the same timeline engine the /planner page uses,
 * scoped to a single day, with day-part tabs and a capacity-aware hint.
 */
export function TodayPlanView({ date }: { date: Date }) {
  const [period, setPeriod] = usePlannerPeriod();
  const capacity = useCapacity();
  const isMobile = useIsMobile();
  const { taskIds, open } = useTray();

  const openTray = () => { tray.setTab("tray"); tray.setOpen(!open); };

  return (
    <section aria-label="Day plan" className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        <PlannerPeriodTabs value={period} onChange={setPeriod} />
        <Button
          size="sm"
          variant="outline"
          onClick={openTray}
          aria-pressed={open}
          aria-label="Toggle the task tray"
          className="ml-auto h-8 shrink-0 rounded-full text-xs"
        >
          <Inbox className="mr-1.5 h-3.5 w-3.5" /> Tray
          {taskIds.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px]">{taskIds.length}</span>
          )}
        </Button>
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full text-xs">
                <ListTodo className="mr-1.5 h-3.5 w-3.5" /> Tasks
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[78vh] p-3">
              <SheetTitle className="sr-only">Task sources</SheetTitle>
              <div className="h-full overflow-hidden pt-2">
                <TaskSourcePanel selectedDate={date} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {capacity.isLow && (
        <p className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground">
          <Leaf className="h-3.5 w-3.5 shrink-0" />
          Low capacity today — keep the anchor and let the optional blocks slide.
        </p>
      )}
      {capacity.isSpacious && (
        <p className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Room to stretch — there's space for one bigger block today.
        </p>
      )}

      <div
        className="min-h-0"
        style={{ height: isMobile ? "68vh" : "calc(100vh - 300px)", minHeight: 420 }}
      >
        {period === "grid" && <PlannerTimeline date={date} />}
        {period === "schedule" && <PlannerScheduleList date={date} />}
        {period === "timeofday" && (
          <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-3">
            <PlannerPeriodList date={date} period="morning" />
            <PlannerPeriodList date={date} period="afternoon" />
            <PlannerPeriodList date={date} period="evening" />
          </div>
        )}
        {(period === "morning" || period === "afternoon" || period === "evening") && (
          <PlannerPeriodList date={date} period={period} />
        )}
      </div>
    </section>
  );
}