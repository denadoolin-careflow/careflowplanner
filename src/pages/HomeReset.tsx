import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Home as HomeIcon, Sparkle, ListChecks, BedDouble, UtensilsCrossed,
  Bath, WashingMachine, DoorOpen, Sofa, Utensils, Briefcase, History, Plus,
  Flame, Clock, Sparkles as SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useResetChecklists, type ResetChecklist, type ResetItem, type ResetKind } from "@/lib/reset-checklists";
import { ChecklistTree } from "@/components/reset/ChecklistTree";
import { AIGenerateMenu } from "@/components/reset/AIGenerateMenu";
import { MoonResetTip } from "@/components/rhythm/MoonResetTip";
import { ResetHistorySheet } from "@/components/reset/ResetHistorySheet";
import { processDueResets } from "@/lib/reset-recurrence";
import { fireConfetti } from "@/lib/confetti";
import { playCompletionChime } from "@/lib/completion-sound";
import { logResetCompletion } from "@/lib/reset-history";
import { pomodoro } from "@/lib/pomodoro-store";
import { useStore } from "@/lib/store";
import {
  ProgressRing, ViewSwitcher, RoomFilterPill, TipsCarousel,
  IntentionCard, QuickFab, SuggestionCard, type ResetView, type QuickAction,
} from "@/components/reset/redesign/pieces";
import { HeroBand } from "@/components/reset/redesign/HeroBand";
import { RoomCard } from "@/components/reset/redesign/RoomCard";
import { RoomCelebration } from "@/components/reset/redesign/RoomCelebration";

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

/** Room keyword → icon.  We match by the checklist name so we don't need a schema change. */
const ROOM_ICONS: { keys: RegExp; icon: typeof HomeIcon }[] = [
  { keys: /kitchen|cook/i,             icon: UtensilsCrossed },
  { keys: /bed(room)?/i,               icon: BedDouble },
  { keys: /bath/i,                     icon: Bath },
  { keys: /laundry|wash/i,             icon: WashingMachine },
  { keys: /entry|hall|foyer|door/i,    icon: DoorOpen },
  { keys: /living|lounge|family/i,     icon: Sofa },
  { keys: /din(ing|e)/i,               icon: Utensils },
  { keys: /office|desk|study/i,        icon: Briefcase },
];
function iconFor(name: string) {
  const hit = ROOM_ICONS.find(r => r.keys.test(name));
  return hit?.icon ?? HomeIcon;
}

const ROOM_FILTERS: { label: string; icon: typeof HomeIcon; match?: RegExp }[] = [
  { label: "All Areas",   icon: SparklesIcon },
  { label: "Kitchen",     icon: UtensilsCrossed, match: /kitchen|cook/i },
  { label: "Living Room", icon: Sofa,            match: /living|lounge|family/i },
  { label: "Bedrooms",    icon: BedDouble,       match: /bed(room)?/i },
  { label: "Bathrooms",   icon: Bath,            match: /bath/i },
  { label: "Laundry",     icon: WashingMachine,  match: /laundry|wash/i },
  { label: "Entryway",    icon: DoorOpen,        match: /entry|hall|foyer/i },
  { label: "Dining Room", icon: Utensils,        match: /din(ing|e)/i },
  { label: "Office",      icon: Briefcase,       match: /office|desk|study/i },
];

// ---------- page ----------
export default function HomeReset({ embedded = false }: { embedded?: boolean } = {}) {
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

  // Auto-run any recurring resets that are due.
  useEffect(() => {
    (async () => {
      try {
        const n = await processDueResets();
        if (n > 0) {
          toast.success(`${n} reset${n > 1 ? "s" : ""} refreshed for today ✨`);
          await reset.refresh();
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /** Aggregated across all active lists — powers the progress ring. */
  const overall = useMemo(() => {
    let done = 0, total = 0, remainingMinutes = 0;
    for (const l of activeLists) {
      const roots = l.items.filter(i => !i.parent_id);
      total += roots.length;
      done += roots.filter(i => i.done).length;
      remainingMinutes += roots.filter(i => !i.done).reduce((s, i) => s + (i.est_minutes ?? 0), 0);
    }
    return {
      pct: total ? Math.round(done / total * 100) : 0,
      done, total, remainingMinutes,
    };
  }, [activeLists]);

  const [view, setView] = useState<ResetView>("checklist");
  const [roomFilter, setRoomFilter] = useState<string>("All Areas");
  const [celebrating, setCelebrating] = useState<{ name: string } | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const prevPctRef = useRef<Record<string, number>>({});

  /** Detect any list transitioning to 100% → fire celebration. */
  useEffect(() => {
    for (const l of activeLists) {
      const roots = l.items.filter(i => !i.parent_id);
      if (roots.length === 0) continue;
      const pct = Math.round(roots.filter(i => i.done).length / roots.length * 100);
      const prev = prevPctRef.current[l.id] ?? pct;
      if (prev < 100 && pct === 100) {
        setCelebrating({ name: l.name });
      }
      prevPctRef.current[l.id] = pct;
    }
  }, [activeLists]);

  /** Filter lists by room pill match, or show all. */
  const visibleLists = useMemo(() => {
    const pill = ROOM_FILTERS.find(p => p.label === roomFilter);
    if (!pill?.match) return activeLists;
    return activeLists.filter(l => pill.match!.test(l.name));
  }, [activeLists, roomFilter]);

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

  const startFirstStep = async () => {
    const pick = activeLists.find(l => {
      const s = listStats(l, { lowEnergy });
      return s.total > 0 && s.done < s.total;
    }) ?? activeLists[0];
    if (!pick) return;
    setCurrentId(pick.id);
    const s = listStats(pick, { lowEnergy });
    if (s.nextUp) startTimer(s.nextUp);
  };

  const resetEntireHome = async () => {
    let count = 0;
    for (const l of activeLists) {
      for (const item of l.items) {
        if (item.done) { await reset.updateItem(item.id, { done: false }); count++; }
      }
    }
    toast.success(`Home reset — ${count} tasks cleared`, {
      description: "A fresh start whenever you're ready.",
    });
  };

  const handleFabAction = async (a: QuickAction) => {
    switch (a) {
      case "task": {
        const list = current ?? activeLists[0];
        if (!list) { toast.info("Create a room first."); break; }
        const title = window.prompt("Add a small step to " + list.name);
        if (title?.trim()) { await reset.addItem(list.id, { title: title.trim() }); toast.success("Added"); }
        break;
      }
      case "room": {
        const name = window.prompt("Name this room (e.g. Kitchen, Bedroom)");
        if (name?.trim()) {
          const id = await reset.createList({ name: name.trim(), kind: "custom" });
          if (id) { setCurrentId(id); toast.success("Room added"); }
        }
        break;
      }
      case "routine": {
        const id = await reset.createList({ name: "New routine", kind: "weekly" });
        if (id) { setCurrentId(id); toast.success("Routine created"); }
        break;
      }
      case "timer": {
        if (!current) { toast.info("Pick a room first."); break; }
        const { nextUp } = listStats(current, { lowEnergy });
        if (nextUp) startTimer(nextUp); else toast.info("Nothing left to time — you're done here!");
        break;
      }
      case "voice": toast.info("Voice capture coming soon."); break;
      case "scan":  toast.info("Room scan coming soon."); break;
    }
  };

  const sheetList = sheetListId
    ? activeLists.find(l => l.id === sheetListId) ?? null
    : null;

  return (
    <div className="reset-theme relative min-h-full space-y-6 pb-24 sm:pb-12">
      {/* Subtle atmospheric wash behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(1000px 500px at 20% 0%, hsl(var(--reset-sage-soft) / 0.55), transparent 60%)," +
            "radial-gradient(700px 400px at 100% 20%, hsl(var(--reset-gold-soft) / 0.4), transparent 60%)," +
            "hsl(var(--reset-cream))",
        }}
      />

      {/* ============ PAGE HEADER ============ */}
      {!embedded && (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(var(--reset-sage-deep))]/70">
              Care · flow
            </p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-semibold leading-tight tracking-tight text-[hsl(var(--reset-charcoal))] sm:text-4xl">
              <span aria-hidden>🏡</span> Home Reset
            </h1>
            <p className="mt-1 text-sm text-[hsl(var(--reset-ink))]/70">
              Refresh your space. Reset your mind.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AIGenerateMenu onGenerated={reset.refresh} />
            <button
              onClick={() => setHistoryOpen(true)}
              className="reset-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              <History className="h-3.5 w-3.5" /> History
            </button>
          </div>
        </header>
      )}

      {/* ============ HERO ============ */}
      <HeroBand
        onStart={startFirstStep}
        onContinue={continueNext}
        onResetAll={resetEntireHome}
        canContinue={!!current && listStats(current, { lowEnergy }).nextUp !== undefined}
      />

      {/* ============ PROGRESS + INTENTION ============ */}
      <section className="grid gap-4 sm:grid-cols-5">
        <div className="reset-glass flex items-center gap-4 p-5 sm:col-span-3">
          <ProgressRing
            value={overall.pct}
            label="Today"
            sublabel={overall.total ? `${overall.done}/${overall.total}` : "No tasks yet"}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--reset-ink))]/55">
              Today's progress
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="reset-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
                <Flame className="h-3 w-3 text-[hsl(var(--reset-gold))]" /> Streak · 3d
              </span>
              <span className="reset-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
                <Clock className="h-3 w-3" /> {overall.remainingMinutes || 0}m left
              </span>
              <span className="reset-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
                {totals.inProgress} in progress
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--reset-ink))]/70">
              {overall.pct === 100 && overall.total > 0
                ? "Everything's done. Beautiful."
                : current
                  ? <>Focus: <span className="font-medium text-[hsl(var(--reset-charcoal))]">{current.name}</span></>
                  : "Pick a room below to begin."}
            </p>
          </div>
        </div>
        <div className="sm:col-span-2">
          <IntentionCard />
        </div>
      </section>

      {/* ============ VIEW SWITCHER ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher value={view} onChange={setView} />
        <span className="text-[11px] text-[hsl(var(--reset-ink))]/55">
          {visibleLists.length} {visibleLists.length === 1 ? "room" : "rooms"}
        </span>
      </div>

      {/* ============ ROOM FILTER RAIL ============ */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {ROOM_FILTERS.map(f => {
            const matched = f.match
              ? activeLists.filter(l => f.match!.test(l.name))
              : activeLists;
            const total = matched.reduce((s, l) => s + l.items.filter(i => !i.parent_id).length, 0);
            const done  = matched.reduce((s, l) => s + l.items.filter(i => !i.parent_id && i.done).length, 0);
            const complete = total > 0 && done === total;
            return (
              <RoomFilterPill
                key={f.label}
                label={f.label}
                icon={f.icon}
                active={roomFilter === f.label}
                complete={complete}
                done={done}
                total={total}
                onClick={() => { setRoomFilter(f.label); haptics.tap(); }}
              />
            );
          })}
        </div>
      </div>

      {/* ============ ROOM CARDS ============ */}
      {activeLists.length === 0 ? (
        <EmptyState
          onCreate={async () => {
            const id = await reset.createList({ name: "Kitchen", kind: "weekly" });
            if (id) setCurrentId(id);
          }}
        />
      ) : (
        <section className="grid gap-3">
          {visibleLists.map((l, idx) => (
            <RoomCard
              key={l.id}
              list={l}
              icon={iconFor(l.name)}
              tint={idx % 3 === 0 ? "sage" : idx % 3 === 1 ? "gold" : "cream"}
              favorites={favorites}
              onFavorite={(id) => setFavorites(f => ({ ...f, [id]: !f[id] }))}
              onOpenAll={() => setSheetListId(l.id)}
              suggestion={smartSuggestion(l)}
              onToggle={(item, done) => {
                if (done) void completeItem(l, item, { celebrate: true });
                else void reset.updateItem(item.id, { done: false });
                setCurrentId(l.id);
              }}
            />
          ))}
          {visibleLists.length === 0 && (
            <p className="reset-chip rounded-2xl px-4 py-6 text-center text-sm text-[hsl(var(--reset-ink))]/60">
              No rooms matching "{roomFilter}" yet.
            </p>
          )}
        </section>
      )}

      {/* ============ TIPS + MOON ============ */}
      <section className="grid gap-3 sm:grid-cols-2">
        <TipsCarousel />
        <div className="reset-glass overflow-hidden p-1">
          <MoonResetTip />
        </div>
      </section>

      {/* ============ SMART SUGGESTIONS (footer strip) ============ */}
      {activeLists.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--reset-ink))]/55">
            Gentle nudges
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <SuggestionCard text="Since you're near the kitchen — wipe the microwave in under a minute." />
            <SuggestionCard text="You usually reset laundry after the kitchen. Want to queue it up?" />
          </div>
        </section>
      )}

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
      </Sheet>

      {/* ============ HISTORY SHEET ============ */}
      <ResetHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* ============ CELEBRATION ============ */}
      <RoomCelebration
        open={!!celebrating}
        roomName={celebrating?.name ?? ""}
        onContinue={() => {
          const next = activeLists.find(l => {
            const s = listStats(l);
            return s.total > 0 && s.done < s.total;
          });
          if (next) setCurrentId(next.id);
        }}
        onClose={() => setCelebrating(null)}
      />

      {/* ============ FAB ============ */}
      {!embedded && <QuickFab onAction={handleFabAction} />}
    </div>
  );
}

/* ---------- smart suggestion ---------- */
function smartSuggestion(list: ResetChecklist): string | undefined {
  const roots = list.items.filter(i => !i.parent_id);
  const remaining = roots.filter(i => !i.done);
  if (remaining.length === 0) return undefined;
  if (remaining.length === 1) return `Almost there — just "${remaining[0].title}" left.`;
  const short = remaining.find(i => (i.est_minutes ?? 99) <= 3);
  if (short) return `Quick win: "${short.title}" takes about ${short.est_minutes} min.`;
  return undefined;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <article className="reset-glass p-8 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--reset-sage-deep))]/70">Begin gently</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-[hsl(var(--reset-charcoal))]">Your first room</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--reset-ink))]/70">
        A handful of tiny steps — nothing more. We'll keep them right here when you return.
      </p>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:-translate-y-0.5 transition-transform"
      >
        <Plus className="h-4 w-4" /> Create your first room
      </button>
    </article>
  );
}
