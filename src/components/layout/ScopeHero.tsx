import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { ScopeNavToggle, type Scope } from "@/components/calendar/ScopeNavToggle";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { cn } from "@/lib/utils";

interface Props {
  scope: Scope;
  /** Anchor date for the period (today / week start / first of month). */
  date: Date;
  /** Big title, e.g. "Today" or "Mar 4 – Mar 10". */
  title: string;
  /** Small line under the title, e.g. "Monday, March 4, 2026". */
  subtitle?: string;
  /** Label shown in the eyebrow after the greeting (e.g. "Week of", "Month of"). */
  eyebrow?: string;
  /** Tiny date picker label, e.g. "Mar 2026". Falls back to long format. */
  pickerLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onDatePick?: (d: Date) => void;
  isCurrent?: boolean;
  /** Right-side actions row (view toggles, links). */
  actions?: React.ReactNode;
  /** Show the inline QuickAddBar at the bottom of the hero. */
  showQuickAdd?: boolean;
  /** Optional content rendered after the nav row (e.g. forecast, transit strip). */
  children?: React.ReactNode;
}

/**
 * Shared calm-gradient hero used across Today / Week / Month so the three
 * planning pages stay visually consistent.
 */
export function ScopeHero({
  scope, date, title, subtitle, eyebrow, pickerLabel,
  onPrev, onNext, onToday, onDatePick, isCurrent,
  actions, showQuickAdd, children,
}: Props) {
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;

  return (
    <div className="cozy-card overflow-hidden">
      <div className="relative gradient-calm px-4 py-4 sm:px-7 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 85% 20%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 70% at 10% 100%, hsl(var(--accent)/0.15), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{personalGreeting(state.settings.name)}</span>
              {eyebrow && <span className="opacity-60">· {eyebrow}</span>}
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[11px] text-foreground/80 backdrop-blur">
              <Clock className="h-3 w-3 text-primary" />
              <span className="tabular-nums">{format(now, "h:mm a")}</span>
              {tempStr && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="tabular-nums">{tempStr}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ScopeNavToggle active={scope} />
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-0.5 backdrop-blur">
              {onPrev && (
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full"
                  onClick={onPrev} aria-label="Previous">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDatePick && (
                <DayPickerButton date={date} onChange={onDatePick} label={pickerLabel} />
              )}
              {onNext && (
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full"
                  onClick={onNext} aria-label="Next">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {onToday && !isCurrent && (
                <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs"
                  onClick={onToday}>
                  {scope === "today" ? "Today" : scope === "week" ? "This week" : "This month"}
                </Button>
              )}
            </div>
            {actions && (
              <div className={cn("ml-auto flex flex-wrap items-center gap-1.5")}>
                {actions}
              </div>
            )}
          </div>

          {children}

          {showQuickAdd && <QuickAddBar date={date} />}
        </div>
      </div>
    </div>
  );
}