import { useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const STAGE_LABEL: Record<RitualTile["stage"], string> = {
  bloom: "Blooming", growing: "Growing", sprout: "Sprouting", seed: "Seed",
};
const STAGE_ORDER: RitualTile["stage"][] = ["bloom", "growing", "sprout", "seed"];

type RitualGroupKey = "none" | "person" | "slot" | "stage";
type RitualSortKey = "smart" | "progress" | "person" | "time";

/** Reusable rituals strip. Set variant="card" for HabitGarden look. */
export function RitualStrip({
  title = "Rituals growing",
  className,
}: { title?: string; className?: string }) {
  const { routines: routineList } = useRoutines();
  const tiles = getRitualTiles(routineList);
  const [focus, setFocus] = useState<Routine | null>(null);
  const [groupKey, setGroupKey] = useState<RitualGroupKey>("none");
  const [sortKey, setSortKey] = useState<RitualSortKey>("smart");

  if (tiles.length === 0) return null;
  const tended = tiles.filter(t => t.ratio >= 1).length;

  const sortTiles = (arr: RitualTile[]) => {
    const copy = [...arr];
    if (sortKey === "progress") {
      copy.sort((a, b) => b.ratio - a.ratio);
    } else if (sortKey === "person") {
      copy.sort((a, b) => a.routine.person_name.localeCompare(b.routine.person_name));
    } else if (sortKey === "time") {
      copy.sort((a, b) => (a.routine.time_of_day ?? "").localeCompare(b.routine.time_of_day ?? ""));
    } else {
      // smart: in-progress first (not yet bloomed), then closest to bloom
      copy.sort((a, b) => {
        const ad = a.ratio >= 1 ? 1 : 0;
        const bd = b.ratio >= 1 ? 1 : 0;
        if (ad !== bd) return ad - bd;
        return b.ratio - a.ratio;
      });
    }
    return copy;
  };

  const sorted = sortTiles(tiles);

  type Group = { id: string; label: string; items: RitualTile[] };
  let groups: Group[] = [{ id: "all", label: "", items: sorted }];
  if (groupKey === "person") {
    const map = new Map<string, RitualTile[]>();
    sorted.forEach(t => {
      const arr = map.get(t.routine.person_name) ?? [];
      arr.push(t); map.set(t.routine.person_name, arr);
    });
    groups = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ id: name, label: name, items }));
  } else if (groupKey === "slot") {
    const map = new Map<string, RitualTile[]>();
    sorted.forEach(t => {
      const arr = map.get(t.routine.slot) ?? [];
      arr.push(t); map.set(t.routine.slot, arr);
    });
    groups = Array.from(map.entries()).map(([slot, items]) => ({
      id: slot, label: SLOT_LABEL[slot as keyof typeof SLOT_LABEL] ?? slot, items,
    }));
  } else if (groupKey === "stage") {
    const map = new Map<RitualTile["stage"], RitualTile[]>();
    sorted.forEach(t => {
      const arr = map.get(t.stage) ?? [];
      arr.push(t); map.set(t.stage, arr);
    });
    groups = STAGE_ORDER.filter(s => map.has(s)).map(s => ({
      id: s, label: `${STAGE_GLYPH[s]} ${STAGE_LABEL[s]}`, items: map.get(s)!,
    }));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h3 className="font-display text-base">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{tended}/{tiles.length} blooming today</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Select value={groupKey} onValueChange={(v) => setGroupKey(v as RitualGroupKey)}>
            <SelectTrigger className="h-7 w-[112px] text-[11px]" aria-label="Group rituals"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Group: None</SelectItem>
              <SelectItem value="person">Group: Person</SelectItem>
              <SelectItem value="slot">Group: Time</SelectItem>
              <SelectItem value="stage">Group: Stage</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as RitualSortKey)}>
            <SelectTrigger className="h-7 w-[112px] text-[11px]" aria-label="Sort rituals"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="smart">Sort: Smart</SelectItem>
              <SelectItem value="progress">Sort: Progress</SelectItem>
              <SelectItem value="time">Sort: Time</SelectItem>
              <SelectItem value="person">Sort: Person</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.map(g => (
        <div key={g.id} className="space-y-2">
          {g.label && (
            <div className="flex items-center gap-1.5 px-1 pt-1">
              <h4 className="text-xs font-semibold text-muted-foreground">{g.label}</h4>
              <span className="rounded-full bg-muted/60 px-1.5 text-[10px] tabular-nums text-muted-foreground">{g.items.length}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.items.map(({ routine, total, done, ratio, stage }) => {
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
        </div>
      ))}

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