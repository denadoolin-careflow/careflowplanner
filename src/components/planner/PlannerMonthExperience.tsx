import { useMemo, useState } from "react";
import { differenceInCalendarDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { AlertTriangle, ChevronDown, ChevronUp, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PlannerMonthView } from "./PlannerMonthView";
import { MonthPlannerPanel } from "./MonthPlannerPanel";
import { CaptureMenu } from "./CaptureMenu";
import { SeasonBanner } from "@/components/seasons/SeasonBanner";
import { PeriodNoteCard } from "@/components/notes/PeriodNoteCard";
import { monthKeyFor } from "@/lib/notes/periods";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { useOverdueTasks } from "./PlannerOverdueSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const PANEL_KEY = "careflow:planner:month-panel:v1";
const ATTENTION_KEY = "careflow:planner:month-attention:v1";

export function PlannerMonthExperience({ date, onOpenDay, onCapture }: { date: Date; onOpenDay: (date: Date) => void; onCapture: () => void }) {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(date);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => { try { return localStorage.getItem(PANEL_KEY) !== "0"; } catch { return true; } });
  const [attentionOpen, setAttentionOpen] = useState(() => { try { return localStorage.getItem(ATTENTION_KEY) === "1"; } catch { return false; } });
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const overdue = useOverdueTasks(date);
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const total = differenceInCalendarDays(end, start) + 1;
  const { items } = usePlannerFeed(start, total);
  const unscheduled = useMemo(() => items.filter(item => item.kind === "task" && !item.time).length, [items]);
  const selectDay = (next: Date) => { setSelectedDate(next); if (isMobile) setMobilePanelOpen(true); };
  const setPanel = (open: boolean) => { setPanelOpen(open); try { localStorage.setItem(PANEL_KEY, open ? "1" : "0"); } catch { /* no-op */ } };
  const setAttention = (open: boolean) => { setAttentionOpen(open); try { localStorage.setItem(ATTENTION_KEY, open ? "1" : "0"); } catch { /* no-op */ } };
  const panel = <MonthPlannerPanel selectedDate={selectedDate} onOpen={openItem} onAdd={onCapture} onOpenDay={onOpenDay} />;

  return <div className="planner-month-experience">
    <div className="planner-month-intro">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Capture · Anchor · Rhythm · Exhale</p><h2 className="font-display text-2xl font-semibold sm:text-3xl">{format(date, "MMMM yyyy")}</h2><p className="mt-1 text-xs text-muted-foreground">A gentle view of what your family is carrying this month.</p></div>
      <div className="flex items-center gap-2"><CaptureMenu onCapture={() => onCapture()} writeDate={selectedDate} />{!isMobile && <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPanel(!panelOpen)} aria-label={panelOpen ? "Hide day schedule" : "Show day schedule"}>{panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}</Button>}</div>
    </div>
    <div className="planner-month-season"><SeasonBanner date={date} compact linkTo="/month/overview" /></div>
    {(overdue.length > 0 || unscheduled > 0) && <section className="planner-needs-attention">
      <Button variant="ghost" onClick={() => setAttention(!attentionOpen)} aria-expanded={attentionOpen} className="h-auto min-h-11 w-full justify-start gap-2 px-3 py-2 text-left">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warm-foreground" /><span className="min-w-0 flex-1"><span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Needs attention</span><span className="block text-xs font-medium">{overdue.length} need a new home · {unscheduled} can stay flexible</span></span>{attentionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {attentionOpen && <div className="grid gap-2 border-t border-border/50 p-3 sm:grid-cols-2"><div className="rounded-md bg-background/60 p-3"><p className="text-sm font-semibold">{overdue.length} overdue</p><p className="text-xs text-muted-foreground">Review when you have space—nothing is failing.</p></div><div className="rounded-md bg-background/60 p-3"><p className="text-sm font-semibold">{unscheduled} without a time</p><p className="text-xs text-muted-foreground">They can remain flexible or become an anchor.</p></div></div>}
    </section>}
    <div className={cn("planner-month-layout", !panelOpen && "planner-month-layout--panel-closed")}>
      <div className="min-w-0"><PlannerMonthView date={date} selectedDate={selectedDate} onSelectDay={selectDay} onOpenItem={openItem} /><div className="mt-3"><PeriodNoteCard kind="monthly" keyISO={monthKeyFor(date)} /></div></div>
      {panelOpen && !isMobile && panel}
    </div>
    <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}><SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl p-4"><SheetHeader className="sr-only"><SheetTitle>Day schedule</SheetTitle><SheetDescription>Schedule and upcoming plans for the selected date.</SheetDescription></SheetHeader>{panel}</SheetContent></Sheet>
    {dialogs}
  </div>;
}
