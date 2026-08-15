import { useMemo } from "react";
import { format } from "date-fns";
import { Check, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCycleSuggestion } from "@/lib/planner/cycle-templates";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { getDayTheme } from "@/lib/planner/day-theme";
import type { Habit } from "@/lib/types";
import type { CyclePhase } from "@/lib/cycle";
import type { CosmicElement } from "@/lib/planner/cosmic-link";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Habit categories that suit each cycle phase and moon element. */
const PHASE_AFFINITY: Record<CyclePhase, Habit["category"][]> = {
  menstrual: ["self-care", "spiritual", "health"],
  follicular: ["creative", "home", "self-care"],
  ovulatory: ["family", "caregiving", "creative"],
  luteal: ["home", "health", "self-care"],
};

const ELEMENT_AFFINITY: Record<CosmicElement, Habit["category"][]> = {
  Fire: ["creative", "health"],
  Earth: ["home", "health"],
  Air: ["family", "creative"],
  Water: ["self-care", "spiritual"],
};

/**
 * Phase-specific habit prompt for a day: surfaces the habits that fit the
 * current cycle phase and moon element, with a one-tap check-in.
 */
export function PhaseHabitNudge({ date, className }: { date: Date; className?: string }) {
  const { state, toggleHabit } = useStore();
  const cycle = useCycleDot(date);
  const suggestion = useCycleSuggestion(date);
  const iso = format(date, "yyyy-MM-dd");
  const element = useMemo(() => getDayTheme(date).element as CosmicElement, [date]);

  const picks = useMemo(() => {
    const habits = state.habits ?? [];
    if (!habits.length) return [];
    const wanted = new Set<Habit["category"]>([
      ...(cycle ? PHASE_AFFINITY[cycle.phase] : []),
      ...ELEMENT_AFFINITY[element],
    ]);
    const scored = habits
      .map(h => ({ h, score: wanted.has(h.category) ? 2 : 0 }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.h.title.localeCompare(b.h.title));
    return scored.slice(0, 3).map(x => x.h);
  }, [state.habits, cycle, element]);

  if (!picks.length) return null;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card/60 p-2.5", className)}>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" aria-hidden />
        {cycle ? `${cycle.label} · ${element}` : `${element} day`} habits
      </p>
      {suggestion && (
        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
          {suggestion.dayNudge}
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {picks.map(h => {
          const done = !!h.log?.[iso];
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => { haptics.snap(); void toggleHabit(h.id, iso); }}
                aria-pressed={done}
                aria-label={`${done ? "Undo" : "Check in"}: ${h.title}`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border border-border/50 px-2 py-1.5 text-left text-[12px] transition-colors hover:border-primary/40",
                  done && "bg-primary/10 text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    done ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                >
                  {done && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </span>
                <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", done && "line-through")}>{h.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
