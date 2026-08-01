import { format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScopeSegmented } from "@/components/today/dashboard/ScopeSegmented";
import { cn } from "@/lib/utils";

export interface PlanHeaderProps {
  /** Which planning scope this page represents. */
  scope: "today" | "week" | "month";
  /** Anchor date for the period. */
  date: Date;
  /** Label shown next to the date picker (defaults to a scope-aware format). */
  label?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onDatePick?: (d: Date) => void;
  /** True when the anchor date is the current day/week/month. */
  isCurrent?: boolean;
  /** Page-specific view toggle (Plan/Board, Schedule/Time of day…). */
  views?: React.ReactNode;
  /** Extra buttons shown before the preferences gear. */
  actions?: React.ReactNode;
  /** Contents of the preferences popover. Omit to hide the gear. */
  prefs?: React.ReactNode;
  className?: string;
}

function defaultLabel(scope: PlanHeaderProps["scope"], date: Date, isCurrent?: boolean) {
  if (scope === "today") return isSameDay(date, new Date()) ? "Today" : format(date, "EEE, MMM d");
  if (scope === "week") return `Week of ${format(date, "MMM d")}`;
  return format(date, "MMMM yyyy");
}

/**
 * Single sticky planning header shared by Today, Week and Month:
 * date navigation · scope pills · page views · actions · preferences.
 */
export function PlanHeader({
  scope, date, label, onPrev, onNext, onToday, onDatePick,
  isCurrent, views, actions, prefs, className,
}: PlanHeaderProps) {
  const current = isCurrent ?? isSameDay(date, new Date());
  const unitLabel = scope === "today" ? "day" : scope;
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-2 mb-1 border-b border-border/40 bg-background/85 px-2 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon" variant="ghost" className="h-9 w-9 rounded-full"
            aria-label={`Previous ${unitLabel}`}
            onClick={onPrev}
            disabled={!onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Pick a date"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-left"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="font-display text-base font-semibold leading-none">
                  {label ?? defaultLabel(scope, date, current)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={(d) => d && onDatePick?.(d)} />
            </PopoverContent>
          </Popover>
          <Button
            size="icon" variant="ghost" className="h-9 w-9 rounded-full"
            aria-label={`Next ${unitLabel}`}
            onClick={onNext}
            disabled={!onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!current && onToday && (
            <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={onToday}>
              {scope === "today" ? "Today" : scope === "week" ? "This week" : "This month"}
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block"><ScopeSegmented active={scope} /></div>
          {views}
          {actions}
          {prefs && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Page preferences">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3 p-3">{prefs}</PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-center sm:hidden"><ScopeSegmented active={scope} /></div>
    </header>
  );
}