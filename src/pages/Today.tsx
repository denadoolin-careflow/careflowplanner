import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { isSameDay, format } from "date-fns";
import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useStore } from "@/lib/store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { ExhaleFlow } from "@/components/today/ExhaleFlow";
import { DailyDebrief } from "@/components/today/DailyDebrief";
import { CollapsibleSection } from "@/components/today/CollapsibleSection";
import { TodayMoonHeader } from "@/components/today/TodayMoonHeader";
import { FocusGoalCard, FocusGoalChip } from "@/components/goals/FocusGoalCard";
import { HorizonStrip, RhythmReviewReminders } from "@/components/today/HorizonStrip";
import { PhaseIcon } from "@/lib/phase-icons";
import { PHASE_CAPTION } from "@/lib/rhythm/horizons";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { WorkspaceQuizInvite } from "@/pages/WorkspaceQuiz";
import { NewMoonGoalCard } from "@/components/today/NewMoonGoalCard";
import { DemoTasksBanner } from "@/components/demo/DemoTasksBanner";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { useTodayView, useTodayPrefs, useTodayDefaultView, TODAY_VIEW_LABELS } from "@/lib/today-view";
import { TodayDashboard } from "@/components/today/dashboard/TodayDashboard";
import { CabinetExpiryCard } from "@/components/today/CabinetExpiryCard";
import { MailReminderCard } from "@/components/today/MailReminderCard";
import { TodayHeader } from "@/components/today/TodayHeader";
import { TodayPlanView } from "@/components/today/TodayPlanView";
import { TodayFocusRail } from "@/components/today/TodayFocusRail";
import { NowNextCard } from "@/components/today/NowNextCard";
import { ArriveBand } from "@/components/today/ArriveBand";
import { SelfCareCard } from "@/components/today/SelfCareCard";
import { JournalCard } from "@/components/today/JournalCard";
import { CareColumn } from "@/components/today/dashboard/CareColumn";
import { GrowColumn } from "@/components/today/dashboard/GrowColumn";
import { RhythmTodayCard } from "@/components/today/RhythmTodayCard";
import { DinnerTonightCard } from "@/components/today/DinnerTonightCard";
import { CleaningTodayCard } from "@/components/today/CleaningTodayCard";
import { LaundryBoard } from "@/components/laundry/LaundryBoard";
import { ConnectionsCard } from "@/components/today/ConnectionsCard";
import { TodayNudgeStrip } from "@/components/today/TodayNudgeStrip";
import { DailyRituals } from "@/components/today/DailyRituals";
import { MoonJournalReminderBanner } from "@/components/cycle/MoonJournalReminderBanner";

import { RoutinesHabitsRow } from "@/components/today/dashboard/RoutinesHabitsRow";
import { CapacityProvider } from "@/components/today/dashboard/capacity-context";
import { burnoutMultiplier, useBurnoutCheckIn } from "@/lib/burnout-checkin";
import { TemplateGallery } from "@/components/today/TemplateGallery";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown } from "lucide-react";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { LunarCheckInCard } from "@/components/today/LunarCheckInCard";
import { PhaseInlinePanel } from "@/components/today/PhaseInlinePanel";
import { PHASE_ORDER, currentPhase } from "@/lib/today-phase-items";

type MobileTab = "plan" | "grow" | "care" | "letgo";
const MOBILE_TABS = [
  ["plan", "Plan", "Shape the day", PHASE_ICONS.plan],
  ["grow", "Grow", "Focus goal, habits and projects", PHASE_ICONS.grow],
  ["care", "Care", "People, home and you", PHASE_ICONS.care],
  ["letgo", "Let go", "Reflect and release", PHASE_ICONS.letgo],
] as const satisfies ReadonlyArray<readonly [MobileTab, string, string, unknown]>;

const BAND_PHASE: Record<string, RhythmPhase> = { Plan: "plan", Grow: "grow", Care: "care", "Let go": "letgo" };
const BAND_ID = (t: string) => `today-${BAND_PHASE[t]}`;

function PhaseBand({ title, children, autoFold }: { title: string; children: React.ReactNode; autoFold?: boolean }) {
  const phase = BAND_PHASE[title];
  const key = `today.band.${phase}.folded`;
  const [folded, setFolded] = useState(() => autoFold ? sessionStorage.getItem(`${key}.open`) !== "1" : localStorage.getItem(key) === "1");
  const toggle = () => setFolded(f => {
    if (autoFold) sessionStorage.setItem(`${key}.open`, f ? "1" : "0"); else localStorage.setItem(key, f ? "0" : "1");
    return !f;
  });
  return (
    <section id={BAND_ID(title)} aria-labelledby={`${BAND_ID(title)}-h`} className="scroll-mt-24 space-y-3">
      <button
        type="button" onClick={toggle} aria-expanded={!folded}
        className="flex min-h-11 w-full items-center gap-3 rounded-2xl border-l-4 bg-card/60 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ borderLeftColor: `hsl(var(--rhythm-${phase}-deep))` }}
      >
        <PhaseIcon phase={phase} />
        <span className="min-w-0 flex-1">
          <h2 id={`${BAND_ID(title)}-h`} className="font-display text-lg leading-tight text-foreground">{title}</h2>
          <span className="block text-xs text-muted-foreground">{PHASE_CAPTION[phase]}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !folded && "rotate-180")} aria-hidden />
      </button>
      {!folded && children}
    </section>
  );
}

function PhaseSectionNav() {
  const [active, setActive] = useState("plan");
  useEffect(() => {
    const els = Object.values(BAND_PHASE).map(p => document.getElementById(`today-${p}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id.replace("today-", ""));
    }, { rootMargin: "-20% 0px -60% 0px" });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <nav aria-label="Today sections" className="sticky top-20 hidden self-start lg:block">
      <ul className="space-y-1">
        {Object.entries(BAND_PHASE).map(([label, p]) => (
          <li key={p}>
            <a href={`#today-${p}`} aria-current={active === p ? "true" : undefined}
              onClick={e => { e.preventDefault(); document.getElementById(`today-${p}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className={cn("flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active === p ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60")}>
              <PhaseIcon phase={p} size="sm" />{label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Today() {
  return (
    <TaskSelectionProvider storageKey="today">
      <TodayInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

/** The Today page body embedded inside the Planner's Day view so both are one page. */
export function TodayDayEmbed({ date, onDate }: { date: Date; onDate: (d: Date) => void }) {
  return (
    <TaskSelectionProvider storageKey="today">
      <TodayInner embedded={{ date, onDate }} />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function TodayInner({ embedded }: { embedded?: { date: Date; onDate: (d: Date) => void } } = {}) {
  const { state, updateProfile } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  useEnsureWeather();
  const [exhaleOpen, setExhaleOpen] = useState(false);
  const [view, setView] = useTodayView();
  const [prefs, setPrefs] = useTodayPrefs();
  const [defaultView, setDefaultView] = useTodayDefaultView();
  const defaultRoute = state.settings.defaultRoute ?? "/";
  const [galleryOpen, setGalleryOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MobileTab>("plan");

  // When arriving with a #slot-morning|afternoon|evening hash, scroll to it.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // Wait for sections to mount
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);

  const [day, setDay] = useState<Date>(() => {
    if (embedded) return embedded.date;
    const d = searchParams.get("date");
    if (d) {
      const parsed = new Date(d + "T00:00:00");
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  useEffect(() => {
    const d = searchParams.get("date");
    if (!d || embedded) return;
    const parsed = new Date(d + "T00:00:00");
    if (!isNaN(parsed.getTime()) && !isSameDay(parsed, day)) setDay(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-open Exhale flow when the reminder toast/notification deep-links here.
  useEffect(() => {
    if (searchParams.get("exhale") === "1") {
      setExhaleOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("exhale");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (embedded && !isSameDay(embedded.date, day)) setDay(embedded.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded?.date]);

  const setDayAndUrl = useCallback((d: Date) => {
    if (embedded) { embedded.onDate(d); return; }
    setDay(d);
    const next = new URLSearchParams(searchParams);
    if (isSameDay(d, new Date())) next.delete("date");
    else next.set("date", format(d, "yyyy-MM-dd"));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, embedded]);

  const isReallyToday = isSameDay(day, new Date());

  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;

  const { entry } = useBurnoutCheckIn(day);
  const capacity = useMemo(() => ({
    level: entry.level,
    multiplier: burnoutMultiplier(entry.level),
    isLow: entry.level === "tender" || entry.level === "depleted",
    isSpacious: entry.level === "spacious",
  }), [entry.level]);

  const P = (phase: RhythmPhase) => <PhaseInlinePanel phase={phase} date={day} onTaskClick={setEditTaskId} />;
  const phaseContent: Record<RhythmPhase, React.ReactNode> = {
    plan: (<>
      {P("plan")}
      {isReallyToday && <NowNextCard date={day} onTaskClick={setEditTaskId} />}
      <TodayNudgeStrip date={day} />
      <RhythmTodayCard date={day} />
    </>),
    grow: (<>
      <FocusGoalCard date={day} />
      {P("grow")}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <GrowColumn date={day} />
        <RoutinesHabitsRow date={day} />
      </div>
    </>),
    care: (<>
      {P("care")}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CareColumn date={day} onTaskClick={setEditTaskId} />
        <SelfCareCard date={day} onExhale={() => setExhaleOpen(true)} />
        <DinnerTonightCard date={day} />
        <CleaningTodayCard />
      </div>
      <LaundryBoard compact />
      <ConnectionsCard date={day} onTaskClick={setEditTaskId} />
    </>),
    letgo: (<>
      <LunarCheckInCard date={day} />
      {P("letgo")}
      <JournalCard date={day} />
      <CollapsibleSection storageKey="planning.section.debrief.collapsed" eyebrow="Let go" title="Review today's shape">
        <DailyDebrief date={day} onTaskClick={setEditTaskId} />
      </CollapsibleSection>
    </>),
  };
  const PHASE_TITLE: Record<RhythmPhase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
  const nowIdx = PHASE_ORDER.indexOf(currentPhase());
  const bands = (autoFold: boolean) => (
    <div className="animate-fade-in space-y-6">
      {PHASE_ORDER.map((ph, i) => (
        <PhaseBand key={`${ph}-${autoFold && isReallyToday && i < nowIdx}`} title={PHASE_TITLE[ph]} autoFold={autoFold && isReallyToday && i < nowIdx}>
          {phaseContent[ph]}
        </PhaseBand>
      ))}
    </div>
  );
  const circle = bands(false);
  const secondary = circle;



  return (
    <CapacityProvider value={capacity}>
      <div className={cn("today-mobile-feed mx-auto w-full min-w-0 max-w-7xl space-y-3 overflow-x-clip", embedded ? "pb-2" : "px-2 pb-12 sm:px-4")}>
        {embedded ? (
          <div role="tablist" aria-label="Day layout" className="flex max-w-full items-center gap-0.5 self-start overflow-x-auto rounded-full border border-border/60 bg-card/70 p-0.5 text-xs">
            {(Object.keys(TODAY_VIEW_LABELS) as Array<keyof typeof TODAY_VIEW_LABELS>).map(k => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
                className={cn("min-h-9 shrink-0 rounded-full px-3 transition-colors", view === k ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>
                {TODAY_VIEW_LABELS[k]}
              </button>
            ))}
          </div>
        ) : <TodayHeader
          date={day}
          onDate={setDayAndUrl}
          view={view}
          onView={setView}
          defaultView={defaultView}
          onDefaultView={setDefaultView}
          prefs={prefs}
          onPrefs={setPrefs}
          defaultRoute={defaultRoute}
          onDefaultRoute={(route) => updateProfile({ default_route: route })}
          onTemplates={() => setGalleryOpen(true)}
        />}
        <TodayMoonHeader date={day} />
        <FocusGoalChip date={day} />
        <HorizonStrip date={day} />
        <DemoTasksBanner />
        {prefs.showQuickAdd && <div className="today-mobile-quick-add"><QuickAddBar date={day} /></div>}
        {/* Gentle notices: grouped so reminders never push the day below the fold. Hidden when empty. */}
        <details
          open={!isMobile}
          className="group rounded-2xl border border-border/60 bg-card/60 [&:not(:has(.today-notices>*))]:hidden"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Bell className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">Gentle reminders</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="today-notices space-y-2 px-2 pb-2">
            {isReallyToday && <NewMoonGoalCard />}
            <MoonJournalReminderBanner date={day} />
            {isReallyToday && <MailReminderCard />}
            {isReallyToday && <CabinetExpiryCard />}
            {isReallyToday && <WorkspaceQuizInvite />}
            {isReallyToday && <RhythmReviewReminders date={day} />}
          </div>
        </details>
        {isReallyToday && <DailyRituals date={day} onEveningReflection={() => setExhaleOpen(true)} />}
        {view !== "board" && <ArriveBand date={day} />}

        {view === "board" ? (
          <>
            {isReallyToday && <NowNextCard date={day} onTaskClick={setEditTaskId} />}
            <TodayDashboard
            date={day}
            onTaskClick={setEditTaskId}
            onExhale={() => setExhaleOpen(true)}
            />
          </>
        ) : view === "flow" ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">{bands(true)}</div>
            {!isMobile && <div className="sticky top-20"><TodayFocusRail date={day} onTaskClick={setEditTaskId} showSources /></div>}
          </div>
        ) : view === "quadrant" ? (
          <div className="animate-fade-in grid grid-cols-1 gap-4 md:grid-cols-2">
            {PHASE_ORDER.map(ph => (
              <section key={ph} aria-label={PHASE_TITLE[ph]} className="min-w-0 space-y-3 rounded-3xl border-t-4 bg-card/40 p-3" style={{ borderTopColor: `hsl(var(--rhythm-${ph}-deep))` }}>
                <h2 className="flex items-center gap-2 font-display text-lg text-foreground"><PhaseIcon phase={ph} size="sm" />{PHASE_TITLE[ph]}</h2>
                {phaseContent[ph]}
              </section>
            ))}
          </div>
        ) : isMobile || view === "tabs" ? (
          <div className={cn("animate-fade-in gap-6", view === "tabs" && !isMobile ? "grid grid-cols-[minmax(0,1fr)_320px] items-start" : "")}>
          <div className="min-w-0 space-y-3">
            <div role="tablist" aria-label="Today phases" className="today-mobile-section-tabs grid grid-cols-4 gap-1 rounded-xl border border-border/60 bg-card/70 p-1 text-xs">
              {MOBILE_TABS.map(([t, label, detail, Icon]) => (
                <button
                  key={t}
                  id={`today-tab-${t}`}
                  role="tab"
                  aria-selected={mobileTab === t}
                  aria-controls={`today-panel-${t}`}
                  tabIndex={mobileTab === t ? 0 : -1}
                  type="button"
                  onClick={() => setMobileTab(t)}
                  onKeyDown={(e) => {
                    const i = MOBILE_TABS.findIndex(([k]) => k === t);
                    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                    if (!step) return;
                    e.preventDefault();
                    const next = MOBILE_TABS[(i + step + MOBILE_TABS.length) % MOBILE_TABS.length][0];
                    setMobileTab(next);
                    document.getElementById(`today-tab-${next}`)?.focus();
                  }}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mobileTab === t ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="sr-only">{detail}</span>
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`today-panel-${mobileTab}`} aria-labelledby={`today-tab-${mobileTab}`} className="animate-fade-in space-y-3">
              {mobileTab === "plan" && (<>{phaseContent.plan}<TodayFocusRail date={day} onTaskClick={setEditTaskId} /><TodayPlanView date={day} /></>)}
              {mobileTab !== "plan" && phaseContent[mobileTab]}
            </div>
          </div>
          {view === "tabs" && !isMobile && <div className="sticky top-20"><TodayFocusRail date={day} onTaskClick={setEditTaskId} showSources /></div>}
          </div>
        ) : (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <TodayFocusRail date={day} onTaskClick={setEditTaskId} showSources />
              <div className="min-w-0 space-y-3">
                {isReallyToday && <NowNextCard date={day} onTaskClick={setEditTaskId} />}
                <TodayPlanView date={day} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[150px_minmax(0,1fr)]">
              <PhaseSectionNav />
              <div className="min-w-0">{secondary}</div>
            </div>
          </div>
        )}
      </div>

      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <ExhaleFlow open={exhaleOpen} onOpenChange={setExhaleOpen} date={day} />
      <TemplateGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onApplied={() => setView("board")}
      />
    </CapacityProvider>
  );
}
