import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays, format, isValid, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { PlannerTaskPanel } from "@/components/planner/PlannerTaskPanel";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerContextPanel } from "@/components/planner/PlannerContextPanel";
import { PlannerQuickCapture } from "@/components/planner/PlannerQuickCapture";

export default function Planner() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const day = useMemo(() => {
    if (!date) return new Date();
    const d = parseISO(date);
    return isValid(d) ? d : new Date();
  }, [date]);

  const [captureOpen, setCaptureOpen] = useState(false);

  const go = (d: Date) => navigate(`/planner/${format(d, "yyyy-MM-dd")}`);

  // Global hotkey: press "c" to open Quick Capture
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCaptureOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Planner</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{format(day, "EEEE, MMMM d")}</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => go(addDays(day, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DayPickerButton date={day} onChange={go} />
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => go(addDays(day, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => go(new Date())}>Today</Button>
          <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => setCaptureOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Capture <kbd className="ml-2 rounded bg-primary-foreground/20 px-1 text-[9px]">C</kbd>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_1fr_300px]">
        <PlannerTaskPanel selectedDate={day} onQuickAdd={() => setCaptureOpen(true)} />
        <PlannerTimeline date={day} />
        <PlannerContextPanel date={day} onChangeDate={go} />
      </div>

      <PlannerQuickCapture open={captureOpen} onOpenChange={setCaptureOpen} defaultDate={day} />
    </div>
  );
}