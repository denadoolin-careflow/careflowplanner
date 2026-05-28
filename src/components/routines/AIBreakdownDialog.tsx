import { useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { routines as routinesApi, type Routine } from "@/lib/routines";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = { text: string; icon?: string; durationMin?: number };

export function AIBreakdownDialog({
  open, onOpenChange, routine,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  routine: Routine;
}) {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const run = async () => {
    const g = goal.trim();
    if (!g) return;
    setLoading(true);
    try {
      const result = await routinesApi.breakdown(g, { person: routine.person_name, slot: routine.slot });
      setSteps(result);
      setSelected(new Set(result.map((_, i) => i)));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't break that down");
    } finally { setLoading(false); }
  };

  const add = async () => {
    const picked = steps.filter((_, i) => selected.has(i));
    if (!picked.length) return;
    const newItems = picked.map(s => ({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`,
      text: s.text,
      done: false,
      icon: s.icon,
      durationMin: s.durationMin ?? 5,
    }));
    await routinesApi.upsert(routine.person_name, routine.slot, {
      items: [...routine.items, ...newItems],
    });
    toast.success(`Added ${picked.length} step${picked.length === 1 ? "" : "s"}`);
    setGoal(""); setSteps([]); setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Break it down
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Describe a goal — AI will split it into icon-tagged, timed steps for {routine.person_name}.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); void run(); }} className="flex gap-2">
          <Input
            autoFocus
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Get ready for school"
            className="text-sm"
          />
          <Button type="submit" disabled={loading || !goal.trim()} className="shrink-0">
            {loading ? "Thinking…" : "Break down"}
          </Button>
        </form>

        {steps.length > 0 && (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {steps.map((s, i) => {
              const on = selected.has(i);
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    const next = new Set(selected);
                    if (on) next.delete(i); else next.add(i);
                    setSelected(next);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors",
                    on ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:bg-muted/30",
                  )}
                >
                  <Checkbox checked={on} className="pointer-events-none" />
                  <span className="text-lg">{s.icon || "•"}</span>
                  <span className="flex-1">{s.text}</span>
                  <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {s.durationMin ?? 5}m
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {steps.length > 0 && (
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => { setSteps([]); setSelected(new Set()); }}>
              Clear
            </Button>
            <Button size="sm" onClick={add} disabled={selected.size === 0}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add {selected.size} step{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}