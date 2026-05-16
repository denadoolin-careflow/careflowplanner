import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  getMoonRemindersEnabled,
  getMoonReminderFor,
  isReminderDismissed,
  dismissReminder,
} from "@/lib/moon-reminders";

export function MoonJournalReminderBanner({ date = new Date() }: { date?: Date }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("moon-reminders-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("moon-reminders-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!getMoonRemindersEnabled()) return null;
  const reminder = getMoonReminderFor(date);
  if (!reminder) return null;
  if (isReminderDismissed(date)) return null;

  return (
    <div
      className="cozy-card relative flex flex-wrap items-center gap-3 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card px-4 py-3"
      role="status"
    >
      <span aria-hidden className="text-xl">{reminder.glyph}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{reminder.label} reminder</p>
        <p className="text-xs text-muted-foreground">{reminder.invitation}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => {
            dismissReminder(date);
            navigate(`/journal?template=${reminder.template}`);
          }}
        >
          Open journal
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full"
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
