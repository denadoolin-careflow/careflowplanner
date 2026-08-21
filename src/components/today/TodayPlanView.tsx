import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerOverdueSection } from "@/components/planner/PlannerOverdueSection";
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
import { CollapsibleSection } from "@/components/today/CollapsibleSection";
import { PhaseHabitNudge } from "@/components/planner/PhaseHabitNudge";
import { TodayInboxRail } from "@/components/today/TodayInboxRail";

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

  const capacityHints = (
    <>
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
    </>
  );

  const actionRow = (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={openTray}
        aria-pressed={open}
        aria-label="Toggle the task tray"
        className="h-8 shrink-0 rounded-full text-xs"
      >
        <Inbox className="mr-1.5 h-3.5 w-3.5" /> Tray
        {taskIds.length > 0 && (
          <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px]">{taskIds.length}</span>
        )}
      </Button>
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
    </div>
  );

  if (isMobile) {
    const plannedPeriod = period === "grid" ? "schedule" : period;
    return (
      <section aria-label="Day plan" className="flex min-h-0 flex-col gap-2">
        {actionRow}
        {capacityHints}
        <PlannerOverdueSection date={date} />
        <PhaseHabitNudge date={date} />

        <CollapsibleSection
          storageKey="today.mobile.section.planned.collapsed"
          eyebrow="Planned"
          title="What's committed today"
          defaultCollapsed={false}
        >
          <div className="space-y-2 px-2 pb-2">
            <div className="overflow-x-auto">
              <PlannerPeriodTabs value={plannedPeriod} onChange={setPeriod} hideGrid />
            </div>
            <div className="max-h-[52vh] overflow-y-auto overscroll-contain">
              {plannedPeriod === "schedule" && <PlannerScheduleList date={date} />}
              {plannedPeriod === "timeofday" && (
                <div className="grid grid-cols-1 gap-3">
                  <PlannerPeriodList date={date} period="morning" />
                  <PlannerPeriodList date={date} period="afternoon" />
                  <PlannerPeriodList date={date} period="evening" />
                </div>
              )}
              {(plannedPeriod === "morning" || plannedPeriod === "afternoon" || plannedPeriod === "evening") && (
                <PlannerPeriodList date={date} period={plannedPeriod} />
              )}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="today.mobile.section.timeblocking.collapsed"
          eyebrow="Time blocking"
          title="Drag tasks onto the grid"
          defaultCollapsed={false}
        >
          <div className="space-y-2 px-2 pb-2">
            <TodayInboxRail date={date} />
            <div className="h-[76vh] min-h-[520px]">
              <PlannerTimeline date={date} />
            </div>
          </div>
        </CollapsibleSection>
      </section>
    );
  }

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
      </div>

      {capacityHints}
      <PhaseHabitNudge date={date} />

      <div
        className="min-h-0"
        style={{ height: "calc(100vh - 260px)", minHeight: 560 }}
      >
        {period === "grid" && <PlannerTimeline date={date} />}
        {period === "schedule" && <PlannerScheduleList date={date} />}
        {period === "timeofday" && (
          <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto">
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