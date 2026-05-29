import { useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoutines, SLOT_LABEL, type Routine } from "@/lib/routines";
import { RoutineFocusMode } from "@/components/routines/RoutineFocusMode";
import { peopleTags, fallbackPersonColor } from "@/lib/people-tags";

export interface RitualTile {
  routine: Routine; total: number; done: number; ratio: number;
  stage: "seed" | "sprout" | "growing" | "bloom";
}

export function getRitualTiles(routineList: Routine[]): RitualTile[] {
  return routineList
    .filter(r => r.items.length > 0)
    .map(r => {
      const total = r.items.length;
      const done = r.items.filter(i => i.done).length;
      const ratio = total > 0 ? done / total : 0;
      const stage = ratio >= 1 ? "bloom" : ratio >= 0.66 ? "growing" : ratio >= 0.33 ? "sprout" : "seed";
      return { routine: r, total, done, ratio, stage: stage as RitualTile["stage"] };
    });
}

const STAGE_GLYPH: Record<RitualTile["stage"], string> = {
  bloom: "🌸", growing: "🌿", sprout: "🌱", seed: "🫧",
};

/** Reusable rituals strip. Set variant="card" for HabitGarden look. */
export function RitualStrip({
  title = "Rituals growing",
  className,
}: { title?: string; className?: string }) {
  const { routines: routineList } = useRoutines();
  const tiles = getRitualTiles(routineList);
  const [focus, setFocus] = useState<Routine | null>(null);

  if (tiles.length === 0) return null;
  const tended = tiles.filter(t => t.ratio >= 1).length;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="font-display text-base">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{tended}/{tiles.length} blooming today</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map(({ routine, total, done, ratio, stage }) => {
          const color = peopleTags.colorFor(routine.person_name) || fallbackPersonColor(routine.person_name);
          return (
            <div key={routine.id} className={cn(
              "cozy-card group relative flex flex-col items-center gap-2 p-3 transition-all",
              ratio >= 1 && "ring-1 ring-primary/40",
            )}>
              <span aria-hidden style={{ background: color }}
                className="absolute left-3 top-3 h-2 w-2 rounded-full opacity-80" />
              <div className="relative flex h-24 w-full items-end justify-center rounded-xl bg-gradient-to-b from-transparent to-muted/40">
                <div className="text-4xl" aria-hidden>{STAGE_GLYPH[stage]}</div>
              </div>
              <div className="w-full text-center">
                <div className="truncate text-sm font-medium">{routine.person_name}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{SLOT_LABEL[routine.slot]}</div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full transition-all"
                  style={{ width: `${Math.round(ratio * 100)}%`, background: color }} />
              </div>
              <div className="text-[10px] text-muted-foreground">{done}/{total} steps</div>
              <Button
                size="sm"
                variant={ratio >= 1 ? "secondary" : "default"}
                onClick={() => setFocus(routine)}
                className="h-7 w-full rounded-full text-[11px]"
              >
                {ratio >= 1 ? <><Check className="mr-1 h-3 w-3" /> Tended</> : <><Play className="mr-1 h-3 w-3" /> Tend</>}
              </Button>
            </div>
          );
        })}
      </div>

      {focus && (
        <RoutineFocusMode
          open={!!focus}
          onOpenChange={(o) => { if (!o) setFocus(null); }}
          routine={focus}
        />
      )}
    </div>
  );
}