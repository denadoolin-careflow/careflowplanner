import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { AffirmationHeader } from "@/components/today/AffirmationHeader";
import { AtmosphereChip } from "@/components/calendar/CalendarHeroChips";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";

interface Props {
  date: Date;
  onDateChange: (d: Date) => void;
  isReallyToday: boolean;
}

/**
 * Calm hero header for the Daily Rhythm Today view.
 * Greeting + date + atmosphere + affirmation in a soft botanical card.
 */
export function RhythmHeader({ date, onDateChange, isReallyToday }: Props) {
  const { state } = useStore();
  return (
    <div className="cozy-card overflow-hidden">
      <div className="relative gradient-calm px-5 py-5 sm:px-7 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 85% 20%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 70% at 10% 100%, hsl(var(--accent)/0.15), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {personalGreeting(state.settings.name)}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-none text-foreground sm:text-4xl">
              Today
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(date, "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AtmosphereChip />
            <div className="inline-flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => onDateChange(addDays(date, -1))}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <DayPickerButton date={date} onChange={onDateChange} />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => onDateChange(addDays(date, 1))}
                aria-label="Next day"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              {!isReallyToday && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-full px-2 text-xs"
                  onClick={() => onDateChange(new Date())}
                >
                  Today
                </Button>
              )}
            </div>
          </div>

          <AffirmationHeader date={date} className="max-w-2xl" />
        </div>
      </div>
    </div>
  );
}