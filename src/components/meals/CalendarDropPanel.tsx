import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { format, isSameDay } from "date-fns";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const REPLACE_KEY = "meals.cal.replace";
const GROC_KEY = "meals.cal.addGroceries";

function DayDroppable({ date, selected, onSelect }:{
  date: Date; selected: boolean; onSelect: () => void;
}) {
  const id = `cal-day-${format(date, "yyyy-MM-dd")}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { calendarDate: format(date, "yyyy-MM-dd") } });
  return (
    <button ref={setNodeRef} onClick={onSelect}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-xs transition",
        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/40",
        isOver && "ring-2 ring-amber-400 bg-amber-400/20 scale-105",
      )}>
      {format(date, "d")}
    </button>
  );
}

function SlotDroppable({ date, slot }: { date: string; slot: typeof SLOTS[number] }) {
  const id = `cal-slot-${date}-${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { calendarDate: date, calendarSlot: slot } });
  return (
    <div ref={setNodeRef}
      className={cn(
        "rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider transition",
        isOver ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-border/60 text-muted-foreground",
      )}>
      {slot}
    </div>
  );
}

export function CalendarDropPanel() {
  const [open, setOpen] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [replace, setReplace] = useState(() => localStorage.getItem(REPLACE_KEY) === "1");
  const [addGroceries, setAddGroceries] = useState(() => localStorage.getItem(GROC_KEY) !== "0");

  useEffect(() => { localStorage.setItem(REPLACE_KEY, replace ? "1" : "0"); }, [replace]);
  useEffect(() => { localStorage.setItem(GROC_KEY, addGroceries ? "1" : "0"); }, [addGroceries]);

  const iso = format(date, "yyyy-MM-dd");

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10">
      <button onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
          Drop on a date
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-2 px-2 pb-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            className="pointer-events-auto rounded-md border border-border/40 p-1"
            components={{
              Day: ({ date: d, displayMonth }) => {
                if (d.getMonth() !== displayMonth.getMonth()) return <span className="text-muted-foreground/30 text-xs">{format(d, "d")}</span>;
                return <DayDroppable date={d} selected={isSameDay(d, date)} onSelect={() => setDate(d)} />;
              },
            } as any}
          />
          <div className="flex flex-wrap items-center justify-between gap-1 px-1">
            <span className="text-[10px] text-muted-foreground">Drop on slot for {format(date, "EEE MMM d")}</span>
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            {SLOTS.map(s => <SlotDroppable key={s} date={iso} slot={s} />)}
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-[11px]">
            <span>Replace if taken</span>
            <Switch checked={replace} onCheckedChange={setReplace} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-[11px]">
            <span>Add to grocery list</span>
            <Switch checked={addGroceries} onCheckedChange={setAddGroceries} />
          </div>
        </div>
      )}
    </div>
  );
}

export const calendarPanelOptions = {
  getReplace: () => localStorage.getItem(REPLACE_KEY) === "1",
  getAddGroceries: () => localStorage.getItem(GROC_KEY) !== "0",
};