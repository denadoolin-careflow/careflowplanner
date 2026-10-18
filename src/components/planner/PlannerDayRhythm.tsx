import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PlannerMoonInsight } from "./PlannerMoonInsight";
import { SolarSeasonGuide } from "./SolarSeasonGuide";
import { CyclePlanningGuide } from "./CyclePlanningGuide";
import { PlannerCapacityBar } from "./PlannerCapacityBar";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getMoonJournalContext } from "@/lib/planner/moon-journal-prompt";
import { solarSeasonFor } from "@/lib/planner/solar-season";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { rhythmPhaseForMoon, RHYTHM_LABEL, todayFavors } from "@/lib/planner/rhythm-phase";
import { isVoidOfCourse } from "@/lib/transits";
import type { CyclePhase } from "@/lib/cycle";
import { MOON_PLAIN, VOC_ADVICE, CAPACITY_NOTE, recommendedHours } from "@/lib/rhythm-guidance";
import { PhaseGroceryButton } from "@/components/cycle/PhaseGroceryButton";

const OPEN_KEY = "careflow:planner:day-rhythm-open";
const TAB_KEY = "careflow:planner:day-rhythm-tab";
type Tab = "moon" | "season" | "cycle" | "capacity";
const TABS: { id: Tab; label: string }[] = [
  { id: "moon", label: "Moon" }, { id: "season", label: "Season" },
  { id: "cycle", label: "Cycle" }, { id: "capacity", label: "Capacity" },
];

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function PlannerDayRhythm({ date, onSelectDate, className }: {
  date: Date;
  onSelectDate?: (date: Date) => void;
  className?: string;
}) {
  const [open, setOpenState] = useState(() => read(OPEN_KEY) === "1");
  const [tab, setTabState] = useState<Tab>(() => (read(TAB_KEY) as Tab) || "moon");
  const setOpen = (o: boolean) => { setOpenState(o); write(OPEN_KEY, o ? "1" : "0"); };
  const setTab = (t: Tab) => { setTabState(t); write(TAB_KEY, t); };

  const moon = getMoonPhase(date);
  const info = MOON_INFO[moon];
  const sign = useMemo(() => { try { return getMoonJournalContext(date).sign; } catch { return null; } }, [date]);
  const season = solarSeasonFor(date);
  const cycle = useCycleDot(date);
  const cyclePhase = (cycle as { phase?: CyclePhase } | null)?.phase ?? null;
  const voc = useMemo(() => { try { return isVoidOfCourse(date); } catch { return false; } }, [date]);
  const phase = rhythmPhaseForMoon(moon);
  const favors = todayFavors(phase, cycle?.label);
  const embedded = "rounded-none border-0 bg-transparent shadow-none";
  const tabs = cycle ? TABS : TABS.filter(t => t.id !== "cycle");
  const activeTab = tabs.some(t => t.id === tab) ? tab : "moon";

  const chip = "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 text-[11px] text-foreground";

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-card/60", className)}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `hsl(var(--rhythm-${phase}))` }} />
      <CollapsibleTrigger className="flex min-h-12 w-full items-start gap-2 py-2 pl-4 pr-3 text-left hover:bg-muted/30">
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="flex items-center gap-2">
            <span className="font-display text-[13px]">Day rhythm</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` }}>
              {RHYTHM_LABEL[phase]}
            </span>
          </span>
          <span className="block text-[11.5px] text-muted-foreground">Today favors: {favors}.</span>
          <span className="block text-[11.5px] text-foreground/80">In plain words: {MOON_PLAIN[moon]}</span>
          {voc && <span className="block text-[11.5px] text-foreground/80">🌑 {VOC_ADVICE}</span>}
          {cyclePhase && <span className="block text-[11.5px] text-foreground/80">
            {CAPACITY_NOTE[cyclePhase]} Aim for about {recommendedHours(6, cyclePhase)}h of focused work.
          </span>}
          <span className="flex gap-1.5 overflow-x-auto pb-0.5" onClick={e => e.stopPropagation()}>
            <span className={chip}>{info.glyph} {info.label}{sign ? ` · ${sign.symbol} ${sign.name}` : ""}</span>
            <span className={chip}>{season.glyph} {season.label}</span>
            {cycle && <span className={chip}>{cycle.label}</span>}
            {voc && <span className={chip}>Void moon</span>}
          </span>
        </span>
        <PlannerCapacityBar date={date} compact className="hidden w-36 shrink-0 border-0 bg-transparent p-0 sm:block" />
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/50">
          <div role="tablist" aria-label="Day rhythm details" className="flex gap-1 overflow-x-auto px-3 pt-2">
            {tabs.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)}
                className={cn("min-h-11 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
                  activeTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60")}>
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {activeTab === "moon" && <PlannerMoonInsight date={date} onSelectDate={onSelectDate} className={embedded} />}
            {activeTab === "season" && <SolarSeasonGuide date={date} className={embedded} />}
            {activeTab === "cycle" && <CyclePlanningGuide date={date} className={embedded} />}
            {activeTab === "capacity" && <div className="p-2"><PlannerCapacityBar date={date} className="border-0 bg-transparent" /></div>}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
