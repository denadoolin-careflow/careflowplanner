import { Target, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { lifeAreaLabel, LIFE_HOUSES } from "@/lib/goals/life-areas";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isComposted } from "@/lib/goals/cycle";

export function LifeAreaGoalPicker({ value, onChange, label = "Life-area goal", allowNone = true }: {
  value?: string; onChange: (id: string | undefined) => void; label?: string; allowNone?: boolean;
}) {
  const { state } = useStore();
  return <Select value={value ?? "none"} onValueChange={id => onChange(id === "none" ? undefined : id)}>
    <SelectTrigger aria-label={label} className="min-w-0"><SelectValue placeholder="Choose a goal" /></SelectTrigger>
    <SelectContent className="z-[80] max-h-80 max-w-[calc(100vw-2rem)]" position="popper" collisionPadding={16}>
      <SelectItem value="none" disabled={!allowNone} className="min-h-11">{allowNone ? "No goal" : "Choose a goal"}</SelectItem>
      {[...LIFE_HOUSES, 0].map(house => {
        const goals = state.goals.filter(g => (g.lifeHouse ?? 0) === house && (!isComposted(g.details) || g.id === value));
        if (!goals.length) return null;
        return <SelectGroup key={house}>
          <SelectLabel className="text-xs text-muted-foreground">{house ? `${house} · ${lifeAreaLabel(house)}` : "Other goals"}</SelectLabel>
          {goals.map(g => <SelectItem key={g.id} value={g.id} className="min-h-11 whitespace-normal break-words">
            {g.title}{g.status === "done" ? " · completed" : ""}
          </SelectItem>)}
        </SelectGroup>;
      })}
      {state.goals.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No goals yet.</p>}
    </SelectContent>
  </Select>;
}

export function LinkedGoalLabels({ ids, className }: { ids?: (string | undefined)[]; className?: string }) {
  const { state } = useStore();
  const goals = state.goals.filter(g => ids?.includes(g.id));
  if (!goals.length) return null;
  return <span className={cn("flex min-w-0 flex-wrap gap-1", className)}>
    {goals.map(g => <span key={g.id} className="inline-flex max-w-full items-start gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs leading-snug text-primary" title={lifeAreaLabel(g.lifeHouse) ?? undefined}>
      <Target className="mt-0.5 h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{g.title}{lifeAreaLabel(g.lifeHouse) && <span className="font-normal"> · {lifeAreaLabel(g.lifeHouse)}</span>}</span>
    </span>)}
  </span>;
}

export function ProjectGoalPicker({ ids = [], onChange }: { ids?: string[]; onChange: (ids: string[]) => void }) {
  const { state } = useStore();
  return <div className="min-w-0 space-y-2">
    <LifeAreaGoalPicker value={undefined} allowNone={false} label="Add life-area goal" onChange={id => { if (id && !ids.includes(id)) onChange([...ids, id]); }} />
    {ids.map(id => {
      const goal = state.goals.find(g => g.id === id);
      return <div key={id} className="flex min-w-0 items-center gap-1">
        <LinkedGoalLabels ids={[id]} className="flex-1" />
        {!goal && <span className="flex-1 text-xs text-muted-foreground">Unavailable goal</span>}
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Unlink ${goal?.title ?? "goal"}`} onClick={() => onChange(ids.filter(g => g !== id))}><X className="h-4 w-4" /></Button>
      </div>;
    })}
  </div>;
}