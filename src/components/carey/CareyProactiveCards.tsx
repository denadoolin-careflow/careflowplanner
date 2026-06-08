import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeCapacity } from "@/lib/carey/capacity";
import { computeBurnout } from "@/lib/carey/burnout";
import { CareyAvatar } from "./CareyAvatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Compass, Heart, Lightbulb, Sparkles, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY = 86400000;

type Card = {
  id: string;
  tone: "warn" | "info" | "soft";
  icon: any;
  title: string;
  body: string;
  cta?: { label: string; prompt: string };
};

function askCarey(prompt: string) {
  window.dispatchEvent(new CustomEvent("careflow:carey:open"));
  window.dispatchEvent(new CustomEvent("careflow:carey:ask", { detail: { prompt } }));
}

export function CareyProactiveCards({ className }: { className?: string }) {
  const { state } = useStore();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = JSON.parse(localStorage.getItem("carey:dismissed-cards") || "{}");
      return new Set(raw.date === today ? (raw.ids ?? []) : []);
    } catch { return new Set(); }
  });

  function dismiss(id: string) {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem("carey:dismissed-cards", JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        ids: [...next],
      }));
    } catch { /* noop */ }
  }

  const cards = useMemo<Card[]>(() => {
    const list: Card[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Capacity
    const cap = computeCapacity(state);
    if (cap.signal === "overloaded") {
      list.push({
        id: "capacity-over",
        tone: "warn", icon: AlertTriangle,
        title: "Today looks heavier than usual",
        body: cap.message,
        cta: { label: "Help me rebalance", prompt: "Today's schedule looks heavier than I typically complete. Help me pick 2-3 tasks to move to tomorrow, prioritizing what matters." },
      });
    } else if (cap.signal === "light") {
      list.push({
        id: "capacity-light",
        tone: "soft", icon: Sparkles,
        title: "You have room today",
        body: cap.message,
        cta: { label: "Suggest a goal step", prompt: "I have a lighter day. Suggest one meaningful step from my active goals I could take today." },
      });
    }

    // 2. Burnout
    const burn = computeBurnout(state);
    if (burn.level === "elevated" || burn.level === "high") {
      list.push({
        id: `burnout-${burn.level}`,
        tone: burn.level === "high" ? "warn" : "info", icon: Heart,
        title: burn.level === "high" ? "You may be running low" : "Stress signals showing up",
        body: [burn.suggestion, ...burn.signals].filter(Boolean).slice(0, 2).join(" "),
        cta: { label: "Plan a recovery", prompt: "I'm noticing burnout signals. Help me design a gentle recovery half-day this week — what to skip, what to keep, and one self-care anchor." },
      });
    }

    // 3. Neglected goal (no linked task completed in 14+ days)
    const goals: any[] = state?.goals ?? [];
    const tasks: any[] = state?.tasks ?? [];
    const now = Date.now();
    const neglected = goals
      .filter(g => (g.progress ?? 0) < 100)
      .map(g => {
        const recent = tasks.find(t => t.goalId === g.id && (t.status === "done" || t.done) && t.lastCompletedAt && (now - Date.parse(t.lastCompletedAt)) <= 14 * DAY);
        return { g, recent: !!recent };
      })
      .filter(x => !x.recent)
      .map(x => x.g);
    if (neglected.length) {
      const top = neglected[0];
      list.push({
        id: `neglected-${top.id}`,
        tone: "info", icon: Target,
        title: `"${top.title}" hasn't moved in a while`,
        body: `This goal hasn't had a completed task in 14+ days. Want a small re-entry step?`,
        cta: { label: "Suggest a tiny step", prompt: `Suggest one tiny, doable step (under 20 min) to re-engage with my goal "${top.title}".` },
      });
    }

    // 4. Forgotten work — overdue tasks
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "done" && !t.done);
    if (overdue.length >= 3) {
      list.push({
        id: "forgotten",
        tone: "info", icon: Lightbulb,
        title: `${overdue.length} things have slipped past their date`,
        body: "Some can probably move, some are real. Want help triaging?",
        cta: { label: "Triage with me", prompt: "I have overdue tasks. Help me triage them: which to reschedule, which to drop, and which one truly needs to happen today." },
      });
    }

    // 5. Cross-bridge: journal -> wellness
    const journals: any[] = state?.journal ?? [];
    const recentLowMood = journals.slice(-5).some(j => j.mood === "low");
    if (recentLowMood) {
      list.push({
        id: "journal-wellness",
        tone: "soft", icon: Compass,
        title: "Your journal mentioned low energy",
        body: "Want Carey to suggest one wellness ritual based on recent entries?",
        cta: { label: "Suggest a ritual", prompt: "Look at my recent journal entries. Suggest one small wellness ritual that matches what I've been writing about." },
      });
    }

    // 6. Weekly reflection — Sundays
    if (new Date().getDay() === 0) {
      list.push({
        id: `weekly-reflection-${today}`,
        tone: "soft", icon: Sparkles,
        title: "Sunday reflection ready",
        body: "Take 5 minutes to close the week with Carey.",
        cta: { label: "Reflect on the week", prompt: "Walk me through a 5-minute weekly reflection: wins, lessons, one pattern, and one intention for next week." },
      });
    }

    return list.filter(c => !dismissed.has(c.id));
  }, [state, dismissed]);

  if (!cards.length) return null;

  return (
    <section className={cn("space-y-2", className)}>
      {cards.slice(0, 3).map(c => (
        <div
          key={c.id}
          className={cn(
            "relative rounded-2xl border p-3.5 transition-colors",
            c.tone === "warn" && "border-amber-500/40 bg-amber-500/5",
            c.tone === "info" && "border-border/60 bg-card/70",
            c.tone === "soft" && "border-border/40 bg-gradient-to-br from-card/70 to-card/30",
          )}
        >
          <button
            onClick={() => dismiss(c.id)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="relative mt-0.5">
              <CareyAvatar size={28} />
              <c.icon className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-background p-0.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Carey</p>
              <h4 className="font-display text-sm font-semibold leading-tight">{c.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.body}</p>
              {c.cta && (
                <Button
                  size="sm" variant="ghost"
                  onClick={() => askCarey(c.cta!.prompt)}
                  className="mt-2 -ml-2 h-7 gap-1 text-xs text-primary hover:bg-primary/10"
                >
                  {c.cta.label} →
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}