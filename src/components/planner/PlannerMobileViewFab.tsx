import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronUp, LayoutGrid, List, Rows3, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { PlannerView, PlannerWeekMode } from "@/lib/planner-prefs";

type Props = {
  view: PlannerView;
  setView: (view: PlannerView) => void;
  period: string;
  setPeriod: (period: any) => void;
  weekMode: PlannerWeekMode;
  setWeekMode: (mode: PlannerWeekMode) => void;
  monthMode: string;
  setMonthMode: (mode: any) => void;
  rangeLayout: string;
  setRangeLayout: (mode: any) => void;
};

const ranges: Array<[PlannerView, string]> = [["day", "Day"], ["3day", "3D"], ["week", "Week"], ["month", "Month"], ["year", "Year"]];

export function PlannerMobileViewFab(props: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const modes = props.view === "day"
    ? [["grid", "Grid", LayoutGrid], ["schedule", "Schedule", Rows3], ["timeofday", "Time", CalendarDays], ["capacity", "Capacity", List]] as const
    : props.view === "week"
      ? [["grid", "Schedule", Rows3], ["board", "Board", LayoutGrid], ["overview", "Overview", CalendarDays], ["list", "List", List], ["table", "Table", Table2]] as const
      : props.view === "month"
        ? [["calendar", "Calendar", CalendarDays], ["overview", "Overview", LayoutGrid]] as const
        : [["default", props.view === "year" ? "Year" : "3 Day", CalendarDays], ["list", "List", List], ["table", "Table", Table2]] as const;
  const currentMode = props.view === "day" ? props.period : props.view === "week" ? props.weekMode : props.view === "month" ? props.monthMode : props.rangeLayout;
  const setMode = (value: string) => {
    if (props.view === "day") props.setPeriod(value);
    else if (props.view === "week") props.setWeekMode(value as PlannerWeekMode);
    else if (props.view === "month") props.setMonthMode(value);
    else props.setRangeLayout(value);
    haptics.tap();
  };
  return <div ref={ref} className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 md:hidden">
    <div className={cn("pointer-events-none absolute bottom-16 right-0 w-[min(92vw,330px)] origin-bottom-right transition duration-300 motion-reduce:transition-none", open ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-90 opacity-0")}>
      <div className="pointer-events-auto rounded-[1.65rem] border border-primary/15 bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Range</p>
        <div className="flex justify-between gap-1">
          {ranges.map(([id, label], i) => <button key={id} type="button" onClick={() => { props.setView(id); haptics.tap(); }} style={{ transform: open ? `translateY(${-Math.sin((i / 4) * Math.PI) * 10}px)` : undefined }} className={cn("grid min-h-11 min-w-11 place-items-center rounded-full px-2 text-xs transition-all duration-300", props.view === id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/70 text-muted-foreground")} aria-pressed={props.view === id}>{label}</button>)}
        </div>
        <div className="my-2 h-px bg-border/50" />
        <div className="grid grid-cols-2 gap-1">
          {modes.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setMode(id)} className={cn("flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs", currentMode === id ? "bg-primary/12 font-medium text-primary" : "text-muted-foreground hover:bg-muted/60")}><Icon className="h-3.5 w-3.5" />{label}{currentMode === id && <Check className="ml-auto h-3.5 w-3.5" />}</button>)}
        </div>
      </div>
    </div>
    <button type="button" onClick={() => { setOpen(v => !v); haptics.tap(); }} aria-expanded={open} aria-label="Choose planner range and view" className="flex h-14 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground shadow-xl transition active:scale-95">
      <CalendarDays className="h-5 w-5" /><span className="text-xs font-semibold">{ranges.find(r => r[0] === props.view)?.[1]}</span><ChevronUp className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
    </button>
  </div>;
}