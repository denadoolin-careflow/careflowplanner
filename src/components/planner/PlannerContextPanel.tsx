import { useMemo, useState, useEffect } from "react";
import { format, isSameDay, isSameMonth, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Star, Sparkles, Timer, Play, Pause, RotateCcw, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { CosmicTimingHint } from "@/components/cosmic/CosmicTimingHint";
import { openTaskEditor } from "@/lib/open-task-editor";

interface Props {
  date: Date;
  onChangeDate: (d: Date) => void;
}

const INTENTION_KEY = (d: Date) => `careflow:intention:${format(d, "yyyy-MM-dd")}`;

export function PlannerContextPanel({ date, onChangeDate }: Props) {
  const { state } = useStore();

  const priorities = useMemo(() => state.tasks.filter(t => !t.done && t.isTopThree).slice(0, 3), [state.tasks]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto pr-1">
      <MiniCalendar date={date} onChange={onChangeDate} />
      <Card title="Today's intention" icon={Heart}>
        <IntentionInput date={date} />
      </Card>
      <Card title="Top priorities" icon={Star}>
        {priorities.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Star tasks in the left panel to promote them here.</p>
        ) : (
          <ul className="space-y-1">
            {priorities.map(t => (
              <li key={t.id} onClick={() => openTaskEditor(t.id)}
                className="flex items-start gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1.5 text-[12px] hover:border-primary/40 cursor-pointer">
                <Star className="mt-0.5 h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
                <span className="min-w-0 flex-1 line-clamp-2 [overflow-wrap:anywhere]">{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Focus timer" icon={Timer}>
        <FocusTimer />
      </Card>
      <Card title="Cosmic" icon={Sparkles}>
        <div className="flex flex-wrap items-center gap-2">
          <MoonPhaseBadge date={date} />
        </div>
        <div className="mt-2">
          <CosmicTimingHint date={date} />
        </div>
      </Card>
    </aside>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-3">
      <header className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </header>
      {children}
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

function IntentionInput({ date }: { date: Date }) {
  const key = INTENTION_KEY(date);
  const [val, setVal] = useState("");
  useEffect(() => { try { setVal(localStorage.getItem(key) ?? ""); } catch {} }, [key]);
  return (
    <Input value={val} onChange={(e) => { setVal(e.target.value); try { localStorage.setItem(key, e.target.value); } catch {} }}
      placeholder="One line for today…" className="h-8 text-xs" />
  );
}

function FocusTimer() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => { if (seconds === 0) setRunning(false); }, [seconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-2">
      <div className="font-mono text-2xl font-semibold tabular-nums">{mm}:{ss}</div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRunning(r => !r)} aria-label={running ? "Pause" : "Start"}>
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRunning(false); setSeconds(25 * 60); }} aria-label="Reset">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-1 text-[10px]">
        {[15, 25, 50].map(m => (
          <button key={m} onClick={() => { setRunning(false); setSeconds(m * 60); }}
            className="rounded-full bg-muted px-2 py-0.5 hover:bg-primary/10">
            {m}m
          </button>
        ))}
      </div>
    </div>
  );
}