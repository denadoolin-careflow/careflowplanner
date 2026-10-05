import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Check, ChevronRight, Moon, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadCheckIn, saveCheckIn, type CheckInRecord } from "@/lib/daily-checkin-store";
import { useStore } from "@/lib/store";
import { RitualStepsEditor } from "./RitualStepsEditor";
import { RitualWeeklyHistory } from "./RitualWeeklyHistory";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function DailyRituals({ date, onEveningReflection }: {
  date: Date;
  onEveningReflection: () => void;
}) {
  const iso = format(date, "yyyy-MM-dd");
  const { state, addJournal } = useStore();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState<"morning" | "evening" | null>(null);
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
  const completeMorning = async () => {
    if (morningDone) return;
    const record = await saveCheckIn(iso, { completed_at: new Date().toISOString() });
    setMorning(record);
  };
  const completeEvening = async () => {
    if (eveningDone) return;
    await addJournal({ date: iso, type: "daily", template: "evening-reflection", title: `Evening Reflection — ${format(date, "MMM d")}`, body: "Evening reflection checklist completed.", tags: ["evening-reflection"] });
  };

  if (isMobile) {
    const rituals = [
      { kind: "morning" as const, title: "Morning Reset", detail: morningDone ? "Complete" : morningStarted ? "Continue" : "Start gently", done: morningDone, Icon: Sunrise },
      { kind: "evening" as const, title: "Evening Reflection", detail: eveningDone ? "Complete" : unfinished ? `${unfinished} to review` : "Close the day", done: eveningDone, Icon: Moon },
    ];
    return (
      <section aria-label="Daily rituals" className="mobile-rituals space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="mobile-feed-kicker">Daily rituals</p>
          <RitualWeeklyHistory date={date} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rituals.map(({ kind, title, detail, done, Icon }) => (
            <div key={kind} className={cn("mobile-ritual-card", expanded === kind && "mobile-ritual-card--open")}>
              <button type="button" className="flex min-h-14 w-full items-center gap-2.5 text-left" aria-expanded={expanded === kind} onClick={() => setExpanded(current => current === kind ? null : kind)}>
                <span className={cn("mobile-ritual-icon", done && "mobile-ritual-icon--done")}>
                  {done ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">{title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{detail}</span>
                </span>
                <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded === kind && "rotate-90")} aria-hidden />
              </button>
              {expanded === kind && (
                <div className="border-t border-border/40 pt-1">
                   <RitualStepsEditor kind={kind} iso={iso} onComplete={kind === "morning" ? completeMorning : completeEvening} />
                  {kind === "morning" ? (
                    <Button asChild size="sm" className="mt-2 h-10 w-full rounded-xl"><Link to="/check-in">{morningDone ? "Review reset" : morningStarted ? "Continue reset" : "Start reset"}</Link></Button>
                  ) : (
                    <Button size="sm" className="mt-2 h-10 w-full rounded-xl" onClick={onEveningReflection}>{eveningDone ? "Review reflection" : "Begin reflection"}</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Daily rituals" className="space-y-2">
    <div className="flex justify-end"><RitualWeeklyHistory date={date} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 shadow-soft backdrop-blur-xl"><div className="flex min-h-[80px] items-center gap-3">
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
       <RitualStepsEditor kind="morning" iso={iso} onComplete={completeMorning} />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 shadow-soft backdrop-blur-xl"><div className="flex min-h-[80px] items-center gap-3">
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
       <RitualStepsEditor kind="evening" iso={iso} onComplete={completeEvening} />
      </div>
    </div>
    </section>
  );
}