import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowRight, Plus, Home as HomeIcon, ListChecks, Sparkle, Check,
  BedDouble, UtensilsCrossed, Bath, WashingMachine, DoorOpen, Sofa,
  ChevronRight, Clock, Timer, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useResetChecklists, type ResetChecklist, type ResetItem, type ResetKind } from "@/lib/reset-checklists";
import { ChecklistTree } from "@/components/reset/ChecklistTree";
import { ChecklistInline } from "@/components/reset/ChecklistInline";
import { AIGenerateMenu } from "@/components/reset/AIGenerateMenu";
import { MoonResetTip } from "@/components/rhythm/MoonResetTip";
import { ResetHistorySheet } from "@/components/reset/ResetHistorySheet";
import { fireConfetti } from "@/lib/confetti";
import { playCompletionChime } from "@/lib/completion-sound";
import { logResetCompletion } from "@/lib/reset-history";
import { pomodoro } from "@/lib/pomodoro-store";
import { useStore } from "@/lib/store";

// ---------- helpers ----------
function currentTimeBlock(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/** Smart "next step" scorer: prefers matching time-block, today's day,
 *  shortest task when low-energy, else sort order. */
function smartNext(list: ResetChecklist, opts: { lowEnergy: boolean }): { item: ResetItem | undefined; reason: string } {
  const roots = list.items.filter(i => !i.parent_id && !i.done);
  if (roots.length === 0) return { item: undefined, reason: "" };
  const block = currentTimeBlock();
  const today = new Date().getDay();
  const scored = roots.map(i => {
    let s = 0;
    const tags: string[] = [];
    if (i.time_block === block) { s += 6; tags.push(block); }
    if (i.day_of_week === today) { s += 5; tags.push("today"); }
    if (opts.lowEnergy && i.est_minutes && i.est_minutes <= 5) { s += 4; tags.push("low-energy"); }
    if (i.est_minutes != null) { s += Math.max(0, 3 - Math.floor((i.est_minutes ?? 0) / 5)); }
    s -= i.sort_order * 0.01;
    return { i, s, tags };
  });
  scored.sort((a, b) => b.s - a.s);
  const top = scored[0];
  const reason = top.tags.length
    ? `Picked for ${top.tags.join(" · ")}${top.i.est_minutes ? ` · ${top.i.est_minutes}m` : ""}`
    : top.i.est_minutes ? `≈ ${top.i.est_minutes}m` : "Next up";
  return { item: top.i, reason };
}

function listStats(list: ResetChecklist, opts?: { lowEnergy?: boolean }) {
  const roots = list.items.filter(i => !i.parent_id);
  const done = roots.filter(i => i.done).length;
  const total = roots.length;
  const { item: nextUp, reason } = smartNext(list, { lowEnergy: !!opts?.lowEnergy });
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, nextUp, reason, roots };
}

const KIND_ACCENT: Record<ResetKind, string> = {
  quick:      "from-rose-100/70 to-rose-50/40 ring-rose-200/60",
  weekly:     "from-emerald-100/70 to-emerald-50/40 ring-emerald-200/60",
  deep:       "from-violet-100/70 to-violet-50/40 ring-violet-200/60",
  low_energy: "from-amber-100/70 to-amber-50/40 ring-amber-200/60",
  custom:     "from-sky-100/70 to-sky-50/40 ring-sky-200/60",
};
const KIND_BAR: Record<ResetKind, string> = {
  quick: "bg-rose-400", weekly: "bg-emerald-500",
  deep: "bg-violet-500", low_energy: "bg-amber-500", custom: "bg-sky-500",
};
const KIND_ICON: Record<ResetKind, typeof BedDouble> = {
  quick: Sparkle, weekly: ListChecks, deep: Sofa, low_energy: BedDouble, custom: HomeIcon,
};

const ZONES = [
  { label: "Bedroom",  icon: BedDouble,        tone: "bg-rose-100/70 text-rose-700" },
  { label: "Kitchen",  icon: UtensilsCrossed,  tone: "bg-emerald-100/70 text-emerald-700" },
  { label: "Bathroom", icon: Bath,             tone: "bg-violet-100/70 text-violet-700" },
  { label: "Laundry",  icon: WashingMachine,   tone: "bg-sky-100/70 text-sky-700" },
  { label: "Entryway", icon: DoorOpen,         tone: "bg-amber-100/70 text-amber-700" },
  { label: "Living",   icon: Sofa,             tone: "bg-stone-100/70 text-stone-700" },
];

// ---------- page ----------
export default function HomeReset() {
  const reset = useResetChecklists({});
  const { state } = useStore();
  const lowEnergy = !!state.settings?.lowEnergyMode;
  const activeLists = useMemo(
    () => reset.lists.filter(l => !l.is_template),
    [reset.lists],
  );
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sheetListId, setSheetListId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Choose current reset: pinned selection → first with progress → first overall
  const current = useMemo(() => {
    if (currentId) {
      const c = activeLists.find(l => l.id === currentId);
      if (c) return c;
    }
    const withProgress = activeLists.find(l => {
      const { done, total } = listStats(l);
      return total > 0 && done < total;
    });
    return withProgress ?? activeLists[0] ?? null;
  }, [activeLists, currentId]);

  const totals = useMemo(() => {
    let remaining = 0;
    let inProgress = 0;
    for (const l of activeLists) {
      const { done, total } = listStats(l);
      remaining += Math.max(0, total - done);
      if (total > 0 && done > 0 && done < total) inProgress += 1;
    }
    return { remaining, inProgress };
  }, [activeLists]);

  const completeItem = async (list: ResetChecklist, item: ResetItem, opts?: { celebrate?: boolean }) => {
    haptics.success();
    await reset.updateItem(item.id, { done: true });
    void logResetCompletion({
      checklist_id: list.id,
      item_id: item.id,
      title: item.title,
      kind: list.kind,
      est_minutes: item.est_minutes,
      duration_seconds: item.est_minutes ? item.est_minutes * 60 : null,
    });
    if (opts?.celebrate !== false) {
      try { playCompletionChime(); } catch {}
      fireConfetti({ count: 70 });
    }
  };

  const continueNext = async () => {
    if (!current) return;
    const { nextUp } = listStats(current, { lowEnergy });
    if (!nextUp) return;
    await completeItem(current, nextUp);
  };

  const startTimer = (item: ResetItem) => {
    const mins = item.est_minutes ?? 5;
    pomodoro.startTemplate({
      label: item.title.slice(0, 60),
      focusSeconds: mins * 60,
      breakSeconds: 5 * 60,
      templateId: "reset",
    });
    haptics.tap();
    toast.success(`${mins}m focus started`, { description: item.title });
  };

  const sheetList = sheetListId
    ? activeLists.find(l => l.id === sheetListId) ?? null
    : null;

  return (
    <div className="space-y-6 pb-4">
      {/* ============ HEADER ============ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100/80 text-rose-700 shadow-soft ring-1 ring-rose-200/60">
            <HomeIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Home Reset
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Small actions. Softer home.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatChip label="tasks remaining" value={totals.remaining} accent="sage" />
              <StatChip label="resets in progress" value={totals.inProgress} accent="blush" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <AIGenerateMenu onGenerated={reset.refresh} />
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="mr-1 h-4 w-4" /> History
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={async () => {
              const id = await reset.createList({ name: "New reset", kind: "custom" });
              if (id) { setCurrentId(id); toast.success("Reset created"); }
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> New reset
          </Button>
        </div>
      </header>

      {/* ============ CURRENT RESET HERO ============ */}
      {current ? (
        <CurrentResetHero
          list={current}
          lowEnergy={lowEnergy}
          onContinue={continueNext}
          onOpenAll={() => setSheetListId(current.id)}
          onCompleteNext={() => continueNext()}
          onStartTimer={() => {
            const { nextUp } = listStats(current, { lowEnergy });
            if (nextUp) startTimer(nextUp);
          }}
        />
      ) : (
        <EmptyHero
          onCreate={async () => {
            const id = await reset.createList({ name: "First reset", kind: "weekly" });
            if (id) setCurrentId(id);
          }}
        />
      )}

      {/* ============ QUICK RESETS ============ */}
      {activeLists.length > 0 && (
        <section>
          <SectionHeader title="Quick Resets" />
          <div className="-mx-1 grid grid-cols-2 gap-3 px-1 sm:grid-cols-3 lg:grid-cols-4">
            {activeLists.map(l => (
              <QuickResetCard
                key={l.id}
                list={l}
                active={current?.id === l.id}
                onSelect={() => { setCurrentId(l.id); haptics.tap(); }}
                onOpenAll={() => setSheetListId(l.id)}
                onToggleItem={(itemId, done) => {
                  const item = l.items.find(i => i.id === itemId);
                  if (!item) return;
                  if (done) {
                    void completeItem(l, item, { celebrate: true });
                  } else {
                    void reset.updateItem(itemId, { done: false });
                  }
                }}
                onAddItem={(title) => reset.addItem(l.id, { title })}
              />
            ))}
          </div>
        </section>
      )}

      {/* ============ HOME ZONES ============ */}
      <section>
        <SectionHeader title="Home Zones" trailing={
          <Link to="/home-areas" className="text-xs font-medium text-primary hover:underline">
            View all zones →
          </Link>
        } />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {ZONES.map(z => (
            <Link
              key={z.label}
              to="/home-areas"
              className="group flex flex-col items-center gap-2 rounded-2xl bg-card/70 p-3 ring-1 ring-border/50 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset ring-white/40", z.tone)}>
                <z.icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-medium text-foreground/80">{z.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ MOON-AWARE RESET ============ */}
      <section>
        <SectionHeader title="Moon-Aware Reset" />
        <MoonResetTip />
      </section>

      {/* ============ ALL TASKS SHEET ============ */}
      <Sheet open={!!sheetList} onOpenChange={(o) => !o && setSheetListId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {sheetList && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{sheetList.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <ChecklistTree
                  list={sheetList}
                  onAdd={(item) => reset.addItem(sheetList.id, item)}
                  onUpdate={reset.updateItem}
                  onDelete={reset.deleteItem}
                  onDuplicate={reset.duplicateItem}
                  onReorder={(parentId, ordered) => reset.reorderItems(sheetList.id, parentId, ordered)}
                  onRenameList={(name) => reset.renameList(sheetList.id, name)}
                  onDeleteList={() => { reset.deleteList(sheetList.id); setSheetListId(null); }}
                  onSaveTemplate={() => { void reset.saveAsTemplate(sheetList.id); toast.success("Saved as template"); }}
                />
              </div>
            </>
          )}
        </SheetContent>
        <SheetTrigger className="hidden" />
      </Sheet>

      {/* ============ HISTORY SHEET ============ */}
      <ResetHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

// ---------- subcomponents ----------
function SectionHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {trailing}
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: number; accent: "sage" | "blush" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 ring-1 ring-border/50 backdrop-blur-sm",
    )}>
      <span className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
        accent === "sage" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
      )}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function CurrentResetHero({
  list, lowEnergy, onContinue, onOpenAll, onCompleteNext, onStartTimer,
}: {
  list: ResetChecklist;
  lowEnergy: boolean;
  onContinue: () => void;
  onOpenAll: () => void;
  onCompleteNext: () => void;
  onStartTimer: () => void;
}) {
  const { done, total, pct, nextUp, reason } = listStats(list, { lowEnergy });
  const complete = total > 0 && done >= total;
  const Icon = KIND_ICON[list.kind] ?? Sparkle;

  return (
    <article
      aria-label="Current reset"
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 ring-1 shadow-soft sm:p-6",
        KIND_ACCENT[list.kind] ?? KIND_ACCENT.custom,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
        Current Reset
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-foreground/80 ring-1 ring-white/60 shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{list.name}</h2>
          <p className="mt-1 text-xs text-foreground/70">
            {total === 0 ? "Add your first small step." : `${done} of ${total} completed`}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Progress value={pct} className={cn("h-2 bg-white/50")} />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white/70 p-3 backdrop-blur-sm ring-1 ring-white/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {complete ? "All done" : "Next up"}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            {complete ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" /> Beautifully done.
              </span>
            ) : nextUp ? (
              <>
                <button
                  aria-label="Complete next step"
                  onClick={(e) => { e.stopPropagation(); onCompleteNext(); }}
                  className="group/check flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/30 transition-all hover:scale-110 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
                >
                  <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/check:opacity-100" />
                </button>
                <span className="truncate text-sm font-medium">{nextUp.title}</span>
                {nextUp.est_minutes ? (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> ≈ {nextUp.est_minutes} min
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No steps yet — add one.</span>
            )}
          </div>
          {!complete && nextUp && reason && (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground/50">{reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!complete && nextUp && (
            <button
              onClick={onStartTimer}
              className="flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium text-foreground/70 ring-1 ring-white/60 hover:text-foreground"
              title="Start a focus timer"
            >
              <Timer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{nextUp.est_minutes ?? 5}m</span>
            </button>
          )}
          <button
            onClick={onOpenAll}
            className="text-xs font-medium text-foreground/70 hover:text-foreground"
          >
            View all
          </button>
          <Button
            onClick={complete ? onOpenAll : onContinue}
            disabled={!complete && !nextUp}
            className="rounded-full bg-[hsl(var(--primary))] px-4 text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
          >
            {complete ? "Open" : "Continue Reset"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function QuickResetCard({
  list, active, onSelect, onOpenAll, onToggleItem, onAddItem,
}: {
  list: ResetChecklist;
  active: boolean;
  onSelect: () => void;
  onOpenAll: () => void;
  onToggleItem: (id: string, done: boolean) => void;
  onAddItem: (title: string) => void;
}) {
  const { done, total, pct } = listStats(list);
  const Icon = KIND_ICON[list.kind] ?? Sparkle;
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-2xl bg-card/80 p-3 ring-1 ring-border/50 backdrop-blur-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-soft",
        active && "ring-2 ring-primary/60",
      )}
    >
      <button
        onClick={onSelect}
        onDoubleClick={onOpenAll}
        className="flex items-center justify-between text-left"
      >
        <span className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
          KIND_ACCENT[list.kind] ?? KIND_ACCENT.custom,
        )}>
          <Icon className="h-4.5 w-4.5 text-foreground/80" />
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
      <button onClick={onSelect} onDoubleClick={onOpenAll} className="min-w-0 text-left">
        <p className="truncate font-display text-sm font-semibold leading-tight">{list.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{done}/{total || 0}</p>
      </button>
      <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/5">
        <div
          className={cn("h-full rounded-full transition-all", KIND_BAR[list.kind] ?? KIND_BAR.custom)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
        className="flex items-center justify-between rounded-md px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span>{expanded ? "Hide tasks" : "Show tasks"}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="border-t border-border/40 pt-2">
          <ChecklistInline
            items={list.items}
            onToggle={onToggleItem}
            onAdd={onAddItem}
            maxVisible={6}
          />
        </div>
      )}
    </div>
  );
}

function EmptyHero({ onCreate }: { onCreate: () => void }) {
  return (
    <article className="rounded-3xl bg-gradient-to-br from-emerald-100/60 via-rose-50/40 to-amber-100/40 p-6 text-center ring-1 ring-border/40 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">Begin gently</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">Your first reset</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A handful of tiny steps — nothing more. We'll keep them right here when you return.
      </p>
      <Button onClick={onCreate} className="mt-4 rounded-full">
        <Plus className="mr-1 h-4 w-4" /> Create your first reset
      </Button>
    </article>
  );
}
