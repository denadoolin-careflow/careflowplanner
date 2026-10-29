import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { CalendarClock, CheckSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import {
  parseInline, phaseOfAppointment, phaseOfTodayTask, pinPhase, readApptDone, readPhasePins, toggleApptDone,
  type InlineKind,
} from "@/lib/today-phase-items";

const PHASE_DAYPART = { plan: "Morning", grow: "Afternoon", care: "Afternoon", letgo: "Evening" } as const;
const PHASE_LABEL = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" } as const;

/** Inline NLP add + checkable list of this phase's tasks and appointments for the day. */
export function PhaseInlinePanel({ phase, date, onTaskClick }: { phase: RhythmPhase; date: Date; onTaskClick?: (id: string) => void }) {
  const { state, addTask, toggleTask, addAppointment } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const [text, setText] = useState("");
  const [force, setForce] = useState<InlineKind | undefined>();
  const [pins, setPins] = useState(readPhasePins);
  const [apptDone, setApptDone] = useState(readApptDone);
  const inputRef = useRef<HTMLInputElement>(null);

  const tasks = useMemo(() => state.tasks.filter(t => t.dueDate === iso && phaseOfTodayTask(t, pins) === phase)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.startTime ?? "99").localeCompare(b.startTime ?? "99")), [state.tasks, iso, pins, phase]);
  const appts = useMemo(() => state.appointments.filter(a => a.date === iso && phaseOfAppointment(a, pins) === phase)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")), [state.appointments, iso, pins, phase]);

  const parsed = text.trim() ? parseInline(text, iso, force) : null;

  const submit = async () => {
    if (!parsed) return;
    let id: string | undefined;
    if (parsed.kind === "appointment") {
      const a = await addAppointment({ title: parsed.title, date: parsed.date, time: parsed.time });
      id = a?.id;
    } else {
      id = await addTask({ title: parsed.title, dueDate: parsed.date, startTime: parsed.time, dayPart: parsed.time ? undefined : PHASE_DAYPART[phase] });
    }
    if (!id) return;
    if (!parsed.time) { pinPhase(id, phase); setPins(readPhasePins()); }
    if (parsed.date !== iso) toast.success(`Added for ${format(parseISO(parsed.date), "EEE, MMM d")}`);
    setText(""); setForce(undefined);
    inputRef.current?.focus();
  };

  const kindBtn = (k: InlineKind, Icon: typeof CheckSquare, label: string) => (
    <button type="button" onClick={() => setForce(k)} aria-pressed={parsed?.kind === k}
      className={cn("inline-flex min-h-8 items-center gap-1 rounded-full border px-2 text-xs",
        parsed?.kind === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />{label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3 space-y-2">
      {(appts.length > 0 || tasks.length > 0) && (
        <ul className="space-y-1" aria-label={`${PHASE_LABEL[phase]} tasks and appointments`}>
          {appts.map(a => {
            const done = apptDone.has(`${a.id}@${iso}`);
            return (
              <li key={a.id} className="flex min-h-11 items-start gap-2">
                <Checkbox className="mt-1" checked={done} aria-label={`Mark ${a.title} done`} onCheckedChange={() => setApptDone(toggleApptDone(a.id, iso))} />
                <CalendarClock className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className={cn("min-w-0 flex-1 break-words text-sm", done && "text-muted-foreground line-through")}>{a.title}</span>
                <Link to={`/planner?date=${iso}`} className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline">{a.time ?? "All day"}</Link>
              </li>
            );
          })}
          {tasks.map(t => (
            <li key={t.id} className="flex min-h-11 items-start gap-2">
              <Checkbox className="mt-1" checked={t.done} aria-label={`Mark ${t.title} done`} onCheckedChange={() => toggleTask(t.id)} />
              <button type="button" onClick={() => onTaskClick?.(t.id)} className={cn("min-w-0 flex-1 break-words text-left text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</button>
              {t.startTime && <Link to={`/planner?date=${iso}`} className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline">{t.startTime}</Link>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={e => { e.preventDefault(); submit(); }} className="flex items-center gap-2">
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          aria-label={`Add to ${PHASE_LABEL[phase]}`}
          placeholder={`Add to ${PHASE_LABEL[phase]}… e.g. "Dentist tomorrow 3pm"`}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm" />
      </form>
      {parsed && (
        <div className="flex flex-wrap items-center gap-1.5 pl-6">
          {kindBtn("task", CheckSquare, "Task")}
          {kindBtn("appointment", CalendarClock, "Appointment")}
          <span className="text-xs text-muted-foreground">
            {parsed.date === iso ? "Today" : format(parseISO(parsed.date), "EEE, MMM d")}{parsed.time ? ` · ${parsed.time}` : ""} · Enter to add
          </span>
        </div>
      )}
    </div>
  );
}
