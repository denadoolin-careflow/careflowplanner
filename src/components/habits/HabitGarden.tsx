import { useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { computeHabitGrowth, STAGE_LABEL, STAGE_AFFIRMATION } from "@/lib/habit-consistency";
import { HabitPlant } from "./HabitPlant";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Flame, Leaf, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { format, subDays } from "date-fns";
import { useRoutines, SLOT_LABEL, type Routine } from "@/lib/routines";
import { RoutineFocusMode } from "@/components/routines/RoutineFocusMode";

export function HabitGarden({ onOpen }: { onOpen?: (id: string) => void } = {}) {
  const { state, toggleHabit } = useStore();
  const today = todayISO();
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const { routines: routineList } = useRoutines();
  const [focusRoutine, setFocusRoutine] = useState<Routine | null>(null);

  const tiles = useMemo(
    () => state.habits.map(h => ({ habit: h, growth: computeHabitGrowth(h) })),
    [state.habits]
  );

  if (tiles.length === 0) {
    return (
      <div className="cozy-card gradient-calm flex flex-col items-center justify-center gap-3 p-10 text-center">
        <Leaf className="h-8 w-8 text-primary/60" />
        <p className="text-sm text-muted-foreground">Your garden is waiting for its first seed.</p>
      </div>
    );
  }

  const doneToday = tiles.filter(t => t.habit.log[today]).length;
  const blooming = tiles.filter(t => t.growth.stageIndex >= 3).length;

  const ritualTiles = routineList
    .filter(r => r.items.length > 0)
    .map(r => {
      const total = r.items.length;
      const done = r.items.filter(i => i.done).length;
      const ratio = total > 0 ? done / total : 0;
      const stage = ratio >= 1 ? "bloom" : ratio >= 0.66 ? "growing" : ratio >= 0.33 ? "sprout" : "seed";
      return { routine: r, total, done, ratio, stage };
    });
  const ritualsTended = ritualTiles.filter(r => r.ratio >= 1).length;

  return (
    <div className="space-y-4">
      <div className="cozy-card gradient-sage flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-display text-lg">Your garden today</div>
          <p className="text-xs text-muted-foreground">
            {doneToday}/{tiles.length} habits tended · {ritualsTended}/{ritualTiles.length} rituals complete · {blooming} blooming
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Plants grow over a rolling 14 days.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map(({ habit, growth }) => {
          const tendedToday = !!habit.log[today];
          const isCelebrating = celebrating === habit.id;
          const handleTend = async () => {
            await toggleHabit(habit.id, today);
            if (!tendedToday) {
              haptics.success();
              setCelebrating(habit.id);
              setTimeout(() => setCelebrating(null), 900);
            } else {
              haptics.tap();
            }
          };
          return (
            <div
              key={habit.id}
              className={cn(
                "cozy-card group relative flex flex-col items-center gap-2 p-3 transition-all",
                tendedToday && "ring-1 ring-primary/40",
              )}
            >
              {isCelebrating && (
                <div className="pointer-events-none absolute inset-0 animate-ping rounded-2xl bg-primary/10" />
              )}
              <div
                onClick={() => onOpen?.(habit.id)}
                role={onOpen ? "button" : undefined}
                className={cn(
                  "relative flex h-24 w-full items-end justify-center rounded-xl bg-gradient-to-b from-transparent to-muted/40 transition-transform",
                  onOpen && "cursor-pointer",
                  isCelebrating && "scale-110",
                )}
              >
                <HabitPlant stage={growth.stage} size={88} />
              </div>

              <button type="button" onClick={() => onOpen?.(habit.id)} className="w-full text-center hover:text-primary">
                <div className="truncate text-sm font-medium" title={habit.title}>{habit.title}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABEL[growth.stage]}
                </div>
              </button>

              {/* 14-day strip */}
              <div className="flex w-full items-center justify-center gap-0.5">
                {Array.from({ length: 14 }, (_, i) => {
                  const d = subDays(new Date(), 13 - i);
                  const k = d.toISOString().slice(0, 10);
                  const done = !!habit.log[k];
                  return (
                    <span
                      key={k}
                      title={`${format(d, "MMM d")}${done ? " ✓" : ""}`}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        done ? "bg-primary" : "bg-muted-foreground/25",
                      )}
                    />
                  );
                })}
              </div>

              <div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Flame className="h-2.5 w-2.5" />{growth.forgivingStreak}d
                </span>
                <span>{growth.doneDays}/{growth.windowDays}</span>
              </div>

              <Button
                size="sm"
                variant={tendedToday ? "secondary" : "default"}
                onClick={handleTend}
                className="h-7 w-full rounded-full text-[11px]"
              >
                {tendedToday ? (
                  <><Check className="mr-1 h-3 w-3" /> Tended</>
                ) : (
                  <>Tend today</>
                )}
              </Button>

              <p className="text-center text-[10px] italic text-muted-foreground/80">
                {STAGE_AFFIRMATION[growth.stage]}
              </p>
            </div>
          );
        })}
      </div>

      {ritualTiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-base">Rituals growing</h3>
            <span className="text-[11px] text-muted-foreground">{ritualsTended}/{ritualTiles.length} blooming today</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ritualTiles.map(({ routine, total, done, ratio, stage }) => (
              <div key={routine.id} className={cn(
                "cozy-card group relative flex flex-col items-center gap-2 p-3 transition-all",
                ratio >= 1 && "ring-1 ring-primary/40",
              )}>
                <div className="relative flex h-24 w-full items-end justify-center rounded-xl bg-gradient-to-b from-transparent to-muted/40">
                  <div className="text-4xl" aria-hidden>
                    {stage === "bloom" ? "🌸" : stage === "growing" ? "🌿" : stage === "sprout" ? "🌱" : "🫧"}
                  </div>
                </div>
                <div className="w-full text-center">
                  <div className="truncate text-sm font-medium">{routine.person_name}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{SLOT_LABEL[routine.slot]}</div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground">{done}/{total} steps</div>
                <Button
                  size="sm"
                  variant={ratio >= 1 ? "secondary" : "default"}
                  onClick={() => setFocusRoutine(routine)}
                  className="h-7 w-full rounded-full text-[11px]"
                >
                  {ratio >= 1 ? <><Check className="mr-1 h-3 w-3" /> Tended</> : <><Play className="mr-1 h-3 w-3" /> Tend</>}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {focusRoutine && (
        <RoutineFocusMode
          open={!!focusRoutine}
          onOpenChange={(o) => { if (!o) setFocusRoutine(null); }}
          routine={focusRoutine}
        />
      )}
    </div>
  );
}
