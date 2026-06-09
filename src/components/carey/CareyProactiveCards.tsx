import { useMemo, useState, useCallback, useEffect } from "react";
import { useStore } from "@/lib/store";
import { computeCapacity } from "@/lib/carey/capacity";
import { computeBurnout } from "@/lib/carey/burnout";
import { CareyAvatar } from "./CareyAvatar";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Compass,
  Heart,
  Lightbulb,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Target,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY = 86400000;

const STORAGE_KEY = "carey:dismissed-cards";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readDismissed(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return new Set(raw.date === todayKey() ? (raw.ids ?? []) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: todayKey(), ids: [...ids] })
    );
  } catch {
    /* noop */
  }
}

type Card = {
  id: string;
  tone: "warn" | "info" | "soft";
  icon: React.ElementType;
  title: string;
  body: string;
  cta?: { label: string; prompt: string };
};

function askCarey(prompt: string) {
  window.dispatchEvent(new CustomEvent("careflow:carey:open"));
  window.dispatchEvent(
    new CustomEvent("careflow:carey:ask", { detail: { prompt } })
  );
}

/* ------------------------------------------------------------------ */
//  Skeleton shimmer while computing
function SkeletonCard() {
  return (
    <div className="relative rounded-2xl border border-border/40 bg-card/60 p-3.5">
      <div className="flex items-start gap-3 pr-6">
        <div className="mt-0.5 h-7 w-7 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CareyProactiveCards({ className, onHide }: { className?: string; onHide?: () => void }) {
  const { state } = useStore();
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);
  const [showDismissed, setShowDismissed] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Small artificial delay so the shimmer feels intentional on fast devices
  useEffect(() => {
    const t = setTimeout(() => setStatus("ready"), 350);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      const next = new Set(dismissed);
      next.add(id);
      setDismissed(next);
      writeDismissed(next);
      toast("Card dismissed", {
        description: "Carey won't show this nudge again today.",
        action: {
          label: "Undo",
          onClick: () => {
            const restored = new Set(next);
            restored.delete(id);
            setDismissed(restored);
            writeDismissed(restored);
          },
        },
      });
    },
    [dismissed]
  );

  const restoreAll = useCallback(() => {
    setDismissed(new Set());
    writeDismissed(new Set());
    setShowDismissed(false);
    toast("All cards restored", { description: "Carey is back with fresh nudges." });
  }, []);

  const { visibleCards, dismissedCards } = useMemo(() => {
    if (status !== "ready") return { visibleCards: [], dismissedCards: [] };

    try {
      const list: Card[] = [];
      const today = todayKey();

      // 1. Capacity
      const cap = computeCapacity(state);
      if (cap.signal === "overloaded") {
        list.push({
          id: "capacity-over",
          tone: "warn",
          icon: AlertTriangle,
          title: "Today looks heavier than usual",
          body: cap.message,
          cta: {
            label: "Help me rebalance",
            prompt:
              "Today's schedule looks heavier than I typically complete. Help me pick 2-3 tasks to move to tomorrow, prioritizing what matters.",
          },
        });
      } else if (cap.signal === "light") {
        list.push({
          id: "capacity-light",
          tone: "soft",
          icon: Sparkles,
          title: "You have room today",
          body: cap.message,
          cta: {
            label: "Suggest a goal step",
            prompt:
              "I have a lighter day. Suggest one meaningful step from my active goals I could take today.",
          },
        });
      }

      // 2. Burnout
      const burn = computeBurnout(state);
      if (burn.level === "elevated" || burn.level === "high") {
        list.push({
          id: `burnout-${burn.level}`,
          tone: burn.level === "high" ? "warn" : "info",
          icon: Heart,
          title:
            burn.level === "high"
              ? "You may be running low"
              : "Stress signals showing up",
          body: [burn.suggestion, ...burn.signals]
            .filter(Boolean)
            .slice(0, 2)
            .join(" "),
          cta: {
            label: "Plan a recovery",
            prompt:
              "I'm noticing burnout signals. Help me design a gentle recovery half-day this week — what to skip, what to keep, and one self-care anchor.",
          },
        });
      }

      // 3. Neglected goal
      const goals: any[] = state?.goals ?? [];
      const tasks: any[] = state?.tasks ?? [];
      const now = Date.now();
      const neglected = goals
        .filter((g) => (g.progress ?? 0) < 100)
        .map((g) => {
          const recent = tasks.find(
            (t) =>
              t.goalId === g.id &&
              (t.status === "done" || t.done) &&
              t.lastCompletedAt &&
              now - Date.parse(t.lastCompletedAt) <= 14 * DAY
          );
          return { g, recent: !!recent };
        })
        .filter((x) => !x.recent)
        .map((x) => x.g);
      if (neglected.length) {
        const top = neglected[0];
        list.push({
          id: `neglected-${top.id}`,
          tone: "info",
          icon: Target,
          title: `"${top.title}" hasn't moved in a while`,
          body: `This goal hasn't had a completed task in 14+ days. Want a small re-entry step?`,
          cta: {
            label: "Suggest a tiny step",
            prompt: `Suggest one tiny, doable step (under 20 min) to re-engage with my goal "${top.title}".`,
          },
        });
      }

      // 4. Forgotten work
      const overdue = tasks.filter(
        (t) => t.dueDate && t.dueDate < today && t.status !== "done" && !t.done
      );
      if (overdue.length >= 3) {
        list.push({
          id: "forgotten",
          tone: "info",
          icon: Lightbulb,
          title: `${overdue.length} things have slipped past their date`,
          body: "Some can probably move, some are real. Want help triaging?",
          cta: {
            label: "Triage with me",
            prompt:
              "I have overdue tasks. Help me triage them: which to reschedule, which to drop, and which one truly needs to happen today.",
          },
        });
      }

      // 5. Journal -> wellness bridge
      const journals: any[] = state?.journal ?? [];
      const recentLowMood = journals.slice(-5).some((j) => j.mood === "low");
      if (recentLowMood) {
        list.push({
          id: "journal-wellness",
          tone: "soft",
          icon: Compass,
          title: "Your journal mentioned low energy",
          body: "Want Carey to suggest one wellness ritual based on recent entries?",
          cta: {
            label: "Suggest a ritual",
            prompt:
              "Look at my recent journal entries. Suggest one small wellness ritual that matches what I've been writing about.",
          },
        });
      }

      // 6. Weekly reflection — Sundays
      if (new Date().getDay() === 0) {
        list.push({
          id: `weekly-reflection-${today}`,
          tone: "soft",
          icon: Sparkles,
          title: "Sunday reflection ready",
          body: "Take 5 minutes to close the week with Carey.",
          cta: {
            label: "Reflect on the week",
            prompt:
              "Walk me through a 5-minute weekly reflection: wins, lessons, one pattern, and one intention for next week.",
          },
        });
      }

      return {
        visibleCards: list.filter((c) => !dismissed.has(c.id)),
        dismissedCards: list.filter((c) => dismissed.has(c.id)),
      };
    } catch (e) {
      console.error("Carey proactive cards error:", e);
      setStatus("error");
      return { visibleCards: [], dismissedCards: [] };
    }
  }, [state, dismissed, status]);

  /* ------------------------------------------------------------------ */
  //  Loading
  if (status === "loading") {
    return (
      <section className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 px-1">
          <CareyAvatar size={18} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Carey is scanning your day…
          </span>
        </div>
        <SkeletonCard />
      </section>
    );
  }

  //  Error
  if (status === "error") {
    return (
      <section className={cn("space-y-2", className)}>
        <div
          className="relative rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5"
        >
          <div className="flex items-start gap-3">
            <CareyAvatar size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Carey
              </p>
              <h4 className="font-display text-sm font-semibold leading-tight">
                Something went wrong
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Carey couldn't read your data right now. Try again in a moment.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStatus("loading")}
                className="mt-2 -ml-2 h-7 gap-1 text-xs text-primary hover:bg-primary/10"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  //  Empty — nothing to show
  if (!visibleCards.length && !dismissedCards.length) {
    return (
      <section className={cn("space-y-2", className)}>
        <div className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-card/70 to-card/30 p-3.5">
          <div className="flex items-start gap-3">
            <CareyAvatar size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Carey
              </p>
              <h4 className="font-display text-sm font-semibold leading-tight">
                All caught up
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Nothing urgent today. Your schedule looks balanced, habits are on track, and no goals are stalled.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  askCarey("I feel like everything is under control. Suggest one small thing I could do today just for me.")
                }
                className="mt-2 -ml-2 h-7 gap-1 text-xs text-[hsl(var(--carey))] hover:bg-[hsl(var(--carey-soft))]"
              >
                <MessageCircle className="h-3 w-3" /> Ask Carey anyway
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  //  All visible dismissed — show restore option
  if (!visibleCards.length && dismissedCards.length) {
    return (
      <section className={cn("space-y-2", className)}>
        <div className="relative rounded-2xl border border-border/40 bg-card/60 p-3.5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--carey))]" />
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-semibold leading-tight">
                You're all set for now
              </h4>
              <p className="text-xs text-muted-foreground">
                {dismissedCards.length} nudge{dismissedCards.length > 1 ? "s" : ""} dismissed today.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={restoreAll}
              className="h-7 gap-1 text-xs text-[hsl(var(--carey))] hover:bg-[hsl(var(--carey-soft))]"
            >
              <RotateCcw className="h-3 w-3" /> Restore
            </Button>
          </div>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------------ */
  //  Main render
  return (
    <section className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <CareyAvatar size={18} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Try this now
          </span>
        </div>
        <div className="flex items-center gap-1">
          {dismissedCards.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDismissed((s) => !s)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {showDismissed ? (
                <>
                  <ChevronUp className="h-2.5 w-2.5" /> Hide dismissed
                </>
              ) : (
                <>
                  <ChevronDown className="h-2.5 w-2.5" /> {dismissedCards.length} dismissed
                </>
              )}
            </button>
          )}
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              title="Hide Try this now"
              aria-label="Hide Try this now section"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" /> Hide
            </button>
          )}
        </div>
      </div>

      {/* Visible cards */}
      {visibleCards.slice(0, 3).map((c) => (
        <div
          key={c.id}
          className={cn(
            "group relative rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-sm",
            c.tone === "warn" &&
              "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/8",
            c.tone === "info" &&
              "border-border/60 bg-card/70 hover:bg-card",
            c.tone === "soft" &&
              "border-border/40 bg-gradient-to-br from-card/70 to-card/30 hover:from-card hover:to-card/50"
          )}
        >
          {/* Dismiss button — clearer hover ring */}
          <button
            onClick={() => dismiss(c.id)}
            aria-label="Dismiss card"
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/50 opacity-0 transition-all hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="relative mt-0.5 shrink-0">
              <CareyAvatar size={28} />
              <c.icon className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-background p-0.5 text-[hsl(var(--carey))]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Carey
              </p>
              <h4 className="font-display text-sm font-semibold leading-tight">
                {c.title}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {c.body}
              </p>
              {c.cta && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => askCarey(c.cta!.prompt)}
                  className="mt-2 -ml-2 h-7 gap-1.5 text-xs font-medium text-[hsl(var(--carey))] hover:bg-[hsl(var(--carey-soft))]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {c.cta.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Show more / overflow hint */}
      {visibleCards.length > 3 && (
        <button
          type="button"
          onClick={() =>
            askCarey(
              "I see you have more nudges for me. Summarize the remaining ones and suggest which I should act on first."
            )
          }
          className="w-full rounded-xl border border-dashed border-border/60 py-2 text-center text-[11px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          +{visibleCards.length - 3} more nudges — ask Carey to summarize
        </button>
      )}

      {/* Dismissed cards (collapsed) */}
      {showDismissed && dismissedCards.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Dismissed today
            </span>
            <button
              type="button"
              onClick={restoreAll}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Restore all
            </button>
          </div>
          {dismissedCards.map((c) => (
            <div
              key={c.id}
              className={cn(
                "relative rounded-2xl border p-3.5 opacity-60 grayscale-[0.3] transition-opacity hover:opacity-90 hover:grayscale-0",
                c.tone === "warn" && "border-amber-500/30 bg-amber-500/5",
                c.tone === "info" && "border-border/50 bg-card/50",
                c.tone === "soft" && "border-border/30 bg-card/40"
              )}
            >
              <button
                onClick={() => {
                  const restored = new Set(dismissed);
                  restored.delete(c.id);
                  setDismissed(restored);
                  writeDismissed(restored);
                }}
                aria-label="Restore card"
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <div className="relative mt-0.5 shrink-0">
                  <CareyAvatar size={24} />
                  <c.icon className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-background p-0.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-medium leading-tight text-muted-foreground">
                    {c.title}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70 leading-relaxed">
                    {c.body}
                  </p>
                  {c.cta && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => askCarey(c.cta!.prompt)}
                      className="mt-1.5 -ml-2 h-6 gap-1 text-[11px] text-muted-foreground hover:bg-muted/50"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {c.cta.label}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
