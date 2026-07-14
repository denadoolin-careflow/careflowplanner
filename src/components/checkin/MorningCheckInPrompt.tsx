import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isoToday, loadCheckIn } from "@/lib/daily-checkin-store";
import { timeOfDayGreeting } from "@/lib/greeting";
import { useStore } from "@/lib/store";

/**
 * Soft inline banner shown at the top of Today until the user completes
 * their morning check-in for the day. Dismissible; auto-hides when done.
 */
export function MorningCheckInPrompt() {
  const iso = isoToday();
  const { state } = useStore();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(`careflow:checkin-dismiss:${iso}`) === "1"; } catch { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    loadCheckIn(iso).then((r) => {
      if (!cancelled) setCompleted(!!r?.completed_at);
    });
    const onEvt = () => loadCheckIn(iso).then((r) => setCompleted(!!r?.completed_at));
    window.addEventListener("careflow:checkin", onEvt);
    return () => { cancelled = true; window.removeEventListener("careflow:checkin", onEvt); };
  }, [iso]);

  if (completed || dismissed) return null;

  return (
    <Card className="reset-glass flex items-center gap-3 border-secondary/40 p-3 sm:p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {timeOfDayGreeting()}{state.settings?.name ? `, ${state.settings.name}` : ""}. Start your morning check-in?
        </p>
        <p className="text-[11px] text-muted-foreground">
          A calm 2-minute conversation to ground your day.
        </p>
      </div>
      <Button asChild size="sm" className="rounded-full">
        <Link to="/check-in">Begin <ChevronRight className="ml-0.5 h-3.5 w-3.5" /></Link>
      </Button>
      <Button
        variant="ghost" size="icon" className="h-8 w-8 shrink-0"
        aria-label="Dismiss"
        onClick={() => {
          try { localStorage.setItem(`careflow:checkin-dismiss:${iso}`, "1"); } catch { /* noop */ }
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  );
}