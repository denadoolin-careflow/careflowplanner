import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Check, ChevronRight, Moon, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadCheckIn, type CheckInRecord } from "@/lib/daily-checkin-store";
import { useStore } from "@/lib/store";

export function DailyRituals({ date, onEveningReflection }: {
  date: Date;
  onEveningReflection: () => void;
}) {
  const iso = format(date, "yyyy-MM-dd");
  const { state } = useStore();
  const [morning, setMorning] = useState<CheckInRecord | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => void loadCheckIn(iso).then(record => { if (active) setMorning(record); });
    refresh();
    window.addEventListener("careflow:checkin", refresh);
    return () => { active = false; window.removeEventListener("careflow:checkin", refresh); };
  }, [iso]);

  const eveningDone = useMemo(
    () => state.journal.some(entry => entry.date === iso && entry.template === "evening-reflection"),
    [state.journal, iso],
  );
  const unfinished = useMemo(
    () => state.tasks.filter(task => task.dueDate === iso && !task.done && !task.parentTaskId).length,
    [state.tasks, iso],
  );
  const morningDone = !!morning?.completed_at;
  const morningStarted = !!morning && !morningDone && !!(morning.mood || morning.capture_text || morning.ai_payload);

  return (
    <section aria-label="Daily rituals" className="grid gap-3 sm:grid-cols-2">
      <div className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-soft backdrop-blur-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-care-anchor-soft text-care-anchor">
          {morningDone ? <Check className="h-5 w-5" aria-hidden /> : <Sunrise className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">Morning Reset</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {morningDone ? "Completed today · revisit anytime" : morningStarted ? "Your reset is waiting where you left it." : "Arrive, choose your focus, and shape the day."}
          </p>
        </div>
        <Button asChild size="sm" variant={morningDone ? "outline" : "default"} className="shrink-0 rounded-full">
          <Link to="/check-in">
            {morningDone ? "Review" : morningStarted ? "Continue" : "Start"}
            <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-soft backdrop-blur-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-care-exhale-soft text-care-exhale">
          {eveningDone ? <Check className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">Evening Reflection</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {eveningDone ? "Completed today · your reflection is saved" : unfinished ? `${unfinished} unfinished ${unfinished === 1 ? "task" : "tasks"} to review gently.` : "Reflect, release, and give tomorrow a soft start."}
          </p>
        </div>
        <Button size="sm" variant={eveningDone ? "outline" : "default"} className="shrink-0 rounded-full" onClick={onEveningReflection}>
          {eveningDone ? "Review" : "Begin"}
          <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </section>
  );
}