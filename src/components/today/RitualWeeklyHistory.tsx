import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Moon, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { loadCheckIn, type CheckInRecord } from "@/lib/daily-checkin-store";
import { readDone, readSteps } from "@/lib/ritual-steps";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function RitualWeeklyHistory({ date }: { date: Date }) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const { state } = useStore();
  const week = useMemo(() => {
    const s = addWeeks(startOfWeek(date, { weekStartsOn: 1 }), offset);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [date, offset]);
  const [morning, setMorning] = useState<Record<string, CheckInRecord | null>>({});

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.all(week.map(d => loadCheckIn(format(d, "yyyy-MM-dd")).then(r => [format(d, "yyyy-MM-dd"), r] as const)))
      .then(rows => { if (active) setMorning(Object.fromEntries(rows)); });
    return () => { active = false; };
  }, [open, week]);

  const mSteps = readSteps("morning"), eSteps = readSteps("evening");
  const mCount = week.filter(d => morning[format(d, "yyyy-MM-dd")]?.completed_at).length;
  const eCount = week.filter(d => state.journal.some(j => j.date === format(d, "yyyy-MM-dd") && j.template === "evening-reflection")).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-full"><CalendarDays className="h-3.5 w-3.5" /> Weekly history</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle className="font-display">Ritual history</SheetTitle></SheetHeader>
        <div className="mt-3 flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setOffset(o => o - 1)} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Button>
          <p className="text-sm font-medium">{format(week[0], "MMM d")} – {format(week[6], "MMM d")}</p>
          <Button size="icon" variant="ghost" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">Morning Reset {mCount}/7 · Evening Reflection {eCount}/7</p>
        <ul className="mt-4 space-y-3">
          {week.map(d => {
            const iso = format(d, "yyyy-MM-dd");
            const m = morning[iso];
            const reflections = state.journal.filter(j => j.date === iso && j.template === "evening-reflection");
            const mDone = readDone("morning", iso).filter(id => mSteps.some(s => s.id === id)).length;
            const eDone = readDone("evening", iso).filter(id => eSteps.some(s => s.id === id)).length;
            return (
              <li key={iso} className="rounded-xl border border-border/50 bg-card/60 p-3">
                <p className="text-sm font-semibold">{format(d, "EEEE, MMM d")}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <span className={cn("flex items-center gap-1.5", !m?.completed_at && "text-muted-foreground")}>
                    {m?.completed_at ? <Check className="h-3.5 w-3.5 text-primary" /> : <Sunrise className="h-3.5 w-3.5" />} Morning · {mDone}/{mSteps.length} steps
                  </span>
                  <span className={cn("flex items-center gap-1.5", !reflections.length && "text-muted-foreground")}>
                    {reflections.length ? <Check className="h-3.5 w-3.5 text-primary" /> : <Moon className="h-3.5 w-3.5" />} Evening · {eDone}/{eSteps.length} steps
                  </span>
                </div>
                {m?.chosen_intention && <p className="mt-2 text-xs"><span className="text-muted-foreground">Intention:</span> {m.chosen_intention}</p>}
                {reflections.map(r => (
                  <p key={r.id} className="mt-2 line-clamp-4 whitespace-pre-line rounded-lg bg-muted/50 p-2 text-xs">{r.body.replace(/<[^>]+>/g, " ").trim() || "Reflection saved."}</p>
                ))}
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
