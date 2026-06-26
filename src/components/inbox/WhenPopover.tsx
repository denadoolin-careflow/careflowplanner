import { useState } from "react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Sun, CloudSun, Moon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type DayPart = "Morning" | "Afternoon" | "Evening";

export interface WhenValue {
  date?: string;        // yyyy-MM-dd
  dayPart: DayPart;
}

interface Props {
  value: WhenValue;
  autoDayPart: DayPart;
  onChange: (v: WhenValue) => void;
  className?: string;
}

const PRESETS: { id: string; label: string; offset?: number; dayPart?: DayPart }[] = [
  { id: "today",       label: "Today" },
  { id: "thisEvening", label: "This Evening", dayPart: "Evening" },
  { id: "tomorrow",    label: "Tomorrow", offset: 1 },
  { id: "thisWeekend", label: "This Weekend" },
  { id: "nextWeek",    label: "Next Week",  offset: 7 },
  { id: "someday",     label: "Someday" },
];

function nextSaturday(): string {
  const d = startOfDay(new Date());
  const offset = (6 - d.getDay() + 7) % 7 || 7;
  return format(addDays(d, offset), "yyyy-MM-dd");
}

export function WhenPopover({ value, autoDayPart, onChange, className }: Props) {
  const [open, setOpen] = useState(false);

  const labelText = (() => {
    if (!value.date) return "When?";
    const d = parseISO(value.date);
    const today = startOfDay(new Date());
    const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (days === 0) return `Today · ${value.dayPart}`;
    if (days === 1) return `Tomorrow · ${value.dayPart}`;
    if (days > 1 && days < 7) return `${format(d, "EEE")} · ${value.dayPart}`;
    return `${format(d, "MMM d")} · ${value.dayPart}`;
  })();

  const applyPreset = (p: typeof PRESETS[number]) => {
    if (p.id === "someday") {
      onChange({ date: undefined, dayPart: value.dayPart });
      setOpen(false);
      return;
    }
    if (p.id === "thisWeekend") {
      onChange({ date: nextSaturday(), dayPart: p.dayPart ?? value.dayPart });
      setOpen(false);
      return;
    }
    const d = format(addDays(startOfDay(new Date()), p.offset ?? 0), "yyyy-MM-dd");
    onChange({ date: d, dayPart: p.dayPart ?? value.dayPart });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground transition",
            value.date && "text-foreground border-primary/30 bg-primary/5",
            className,
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {labelText}
          {value.date && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={(e) => { e.stopPropagation(); onChange({ date: undefined, dayPart: value.dayPart }); }}
              className="ml-0.5 inline-grid h-3.5 w-3.5 place-items-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3 pointer-events-auto">
        <div className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Schedule</div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-left text-[12.5px] font-medium hover:border-primary/40 hover:bg-primary/5"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3 mb-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Time of day</div>
        <div className="inline-flex w-full items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5">
          {([
            { v: "Morning",   Icon: Sun },
            { v: "Afternoon", Icon: CloudSun },
            { v: "Evening",   Icon: Moon },
          ] as const).map(({ v, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...value, dayPart: v })}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1 text-[12px] transition-colors",
                value.dayPart === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              title={v === autoDayPart ? `${v} · auto` : v}
            >
              <Icon className="h-3 w-3" />
              {v}
            </button>
          ))}
        </div>
        {value.dayPart === autoDayPart && (
          <div className="mt-1.5 text-[10.5px] text-muted-foreground">Suggested by time of day.</div>
        )}

        <div className="mt-3 mb-1 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Pick a date</div>
        <Calendar
          mode="single"
          selected={value.date ? parseISO(value.date) : undefined}
          onSelect={(d) => {
            if (d) {
              onChange({ ...value, date: format(d, "yyyy-MM-dd") });
              setOpen(false);
            }
          }}
          initialFocus
          className={cn("p-0 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}