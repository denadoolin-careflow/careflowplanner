import { format } from "date-fns";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { timeOfDayGreeting } from "@/lib/greeting";
import { DayProgressRing } from "./DayProgressRing";
import { MoonInsightCard } from "./MoonInsightCard";
import { PlannerViewToggle } from "./PlannerViewToggle";
import { CaptureMenu } from "./CaptureMenu";
import { PlannerFocusButton } from "./PlannerFocusButton";
import { useStore } from "@/lib/store";
import type { PlannerView } from "@/lib/planner-prefs";

interface Props {
  date: Date;
  view: PlannerView;
  onView: (v: PlannerView) => void;
  onPrev: () => void;
  onNext: () => void;
  onGoto: (d: Date) => void;
  onToday: () => void;
  onCapture: () => void;
  onPlanMyDay: () => void;
  onCommand: () => void;
  compact?: boolean;
}

export function PlannerRhythmHeader(props: Props) {
  const { date, view, onView, onPrev, onNext, onGoto, onToday, onCapture, onPlanMyDay } = props;
  const { state } = useStore();
  const displayName = (state.user as any)?.displayName || (state.user as any)?.name || "";

  return (
    <div className="planner-surface space-y-3">
      {/* Rhythm greeting row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{timeOfDayGreeting()}{displayName ? `, ${displayName}` : ""}</span>
          </p>
          <p className="text-[12px] italic text-muted-foreground/80">Let's create a day that aligns with your rhythm.</p>
        </div>
        <div className="flex items-center gap-2">
          <DayProgressRing date={date} />
          <MoonInsightCard date={date} />
        </div>
      </div>

      {/* Title + controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Planner</p>
          <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
            {format(date, "EEEE, MMMM d")}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PlannerViewToggle value={view} onChange={onView} />
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={onPrev} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DayPickerButton date={date} onChange={onGoto} />
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={onNext} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="hidden h-8 rounded-full text-xs sm:inline-flex" onClick={onToday}>Today</Button>
          <PlannerFocusButton date={date} />
          <Button size="sm" variant="secondary" className="h-8 rounded-full bg-primary/15 text-xs text-primary hover:bg-primary/25" onClick={onPlanMyDay}>
            <Sparkles className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Plan my day</span>
          </Button>
          <CaptureMenu onCapture={onCapture} />
        </div>
      </div>
    </div>
  );
}