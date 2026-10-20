import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  getMoonRemindersEnabled,
  getMoonReminderFor,
  isReminderDismissed,
  dismissReminder,
  getNewMoonRemindersEnabled,
  newMoonReminderFor,
} from "@/lib/moon-reminders";
import { useAstrologyEnabled } from "@/lib/astrology-prefs";
import { useMonthlyPhaseIntentions } from "@/hooks/useMonthlyPhaseIntentions";
import { MONTHLY_PHASES } from "@/lib/planner/monthly-phase-intentions";
import { LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";

function MonthlyFocus({ date }: { date: Date }) {
  const { intentions, loading, error } = useMonthlyPhaseIntentions(date);
  if (loading) return <p className="text-xs text-muted-foreground">Loading monthly focus…</p>;
  if (error) return <p className="text-xs text-muted-foreground">Open your Planner to see your saved intentions.</p>;
  return <dl className="mt-2 grid gap-2 sm:grid-cols-2">{MONTHLY_PHASES.map(phase => <div key={phase} className="min-w-0 text-xs"><dt className="font-medium">{LUNAR_RHYTHM[phase].label}</dt><dd className="break-words text-muted-foreground">{intentions[phase] || LUNAR_RHYTHM[phase].invitation}</dd></div>)}</dl>;
}

export function MoonJournalReminderBanner({ date = new Date() }: { date?: Date }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [astroOn] = useAstrologyEnabled();

  useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("moon-reminders-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("moon-reminders-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!astroOn) return null;
  const newMoon = getNewMoonRemindersEnabled() ? newMoonReminderFor(date) : null;
  if (!getMoonRemindersEnabled() && !newMoon) return null;
  const reminder = getMoonReminderFor(date);
  if (!reminder && !newMoon) return null;
  if (isReminderDismissed(date)) return null;

  return (
    <div
      className="cozy-card relative flex flex-wrap items-center gap-3 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card px-4 py-3"
      role="status"
    >
      <span aria-hidden className="text-xl">{newMoon ? "🌑" : reminder?.glyph}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{newMoon ? `New moon · ${date.toLocaleDateString(undefined, { month: "long" })} focus` : `${reminder?.label} reminder`}</p>
        {newMoon ? <MonthlyFocus date={date} /> : <p className="text-xs text-muted-foreground">{reminder?.invitation}</p>}
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <Button
          size="sm"
          className="min-h-11 rounded-full sm:min-h-9"
          onClick={() => {
            if (newMoon) navigate(newMoon.planner);
            else if (reminder) { dismissReminder(date); navigate(`/journal?template=${reminder.template}`); }
          }}
        >
          {newMoon ? "Open Planner" : "Open journal"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-full sm:h-8 sm:w-8"
          onClick={() => dismissReminder(date)}
          aria-label="Dismiss"
          title="Not today"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
