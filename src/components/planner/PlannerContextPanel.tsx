import { useMemo, useState, useEffect } from "react";
import { format, isSameDay, isSameMonth, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { pomodoro, usePomodoro, formatPomoTime } from "@/lib/pomodoro-store";
import { toast } from "sonner";
import { DayPulseCard } from "./DayPulseCard";
import { MoonEnergyCard } from "./MoonEnergyCard";
import { TodayIntentionCard } from "./TodayIntentionCard";
import { TopPrioritiesCard } from "./TopPrioritiesCard";

interface Props {
  date: Date;
  onChangeDate: (d: Date) => void;
}

export function PlannerContextPanel({ date, onChangeDate }: Props) {
  const [moreOpen, setMoreOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("careflow:planner:context-more") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("careflow:planner:context-more", moreOpen ? "1" : "0"); } catch { /* noop */ }
  }, [moreOpen]);
  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto pr-1">
      <DayPulseCard date={date} />
      <TodayIntentionCard date={date} />
      <TopPrioritiesCard date={date} />
      <ActiveFocusMini />
      <button
        type="button"
        onClick={() => setMoreOpen(o => !o)}
        aria-expanded={moreOpen}
        className="flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !moreOpen && "-rotate-90")} />
        More context
      </button>
      {moreOpen && (
        <>
          <MiniCalendar date={date} onChange={onChangeDate} />
          <MoonEnergyCard date={date} />
        </>
      )}
    </aside>
  );
}

function ActiveFocusMini() {
  const s = usePomodoro();
  if (!s.taskId) return null;
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <header className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">Focusing on</header>
      <p className="line-clamp-2 text-xs [overflow-wrap:anywhere]">{s.taskTitle}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="font-mono text-lg font-semibold tabular-nums">{formatPomoTime(s.remaining)}</div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => pomodoro.toggle()}>
          {s.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => pomodoro.stop()}><X className="h-3.5 w-3.5" /></Button>
      </div>
    </section>
  );
}

function MiniCalendar({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const [cursor, setCursor] = useState(startOfMonth(date));
  useEffect(() => { setCursor(startOfMonth(date)); }, [date]);
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days: Date[] = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = new Date();
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-3">
      <header className="mb-2 flex items-center justify-between">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCursor(c => addMonths(c, -1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <span className="text-xs font-semibold">{format(cursor, "MMMM yyyy")}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCursor(c => addMonths(c, 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
      </header>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-muted-foreground">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const selected = isSameDay(d, date);
          const dim = !isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          return (
            <button key={i} onClick={() => onChange(d)}
              className={cn(
                "grid h-7 place-items-center rounded-md text-[11px] transition-colors",
                dim && "text-muted-foreground/40",
                !selected && !isToday && "hover:bg-muted",
                isToday && !selected && "text-primary font-semibold",
                selected && "bg-primary text-primary-foreground font-semibold",
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </section>
  );
}