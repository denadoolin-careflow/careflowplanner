import { useMemo, useState } from "react";
import { Plus, Trash2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/cards/SectionCard";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_ZONES = [
  "Kitchen", "Bathrooms", "Bedrooms", "Laundry",
  "Living Room", "Playroom", "Outdoors", "Whole home",
];

export function ZonesTab() {
  const { state, addCleaning, toggleCleaning, deleteCleaning, resetThisWeek } = useStore() as any;
  const cleaning: any[] = state.cleaning ?? [];
  const [newZone, setNewZone] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const zones = useMemo(() => {
    const set = new Set<string>([...DEFAULT_ZONES, ...cleaning.map((c) => c.zone || "Whole home")]);
    return Array.from(set);
  }, [cleaning]);

  const byZone = useMemo(() => {
    const m: Record<string, any[]> = {};
    zones.forEach((z) => { m[z] = []; });
    cleaning.forEach((c) => {
      const z = c.zone || "Whole home";
      (m[z] ||= []).push(c);
    });
    return m;
  }, [cleaning, zones]);

  const onAdd = async (zone: string) => {
    const title = (drafts[zone] || "").trim();
    if (!title) return;
    await addCleaning({ title, zone, cadence: "weekly" });
    setDrafts((d) => ({ ...d, [zone]: "" }));
  };

  const onResetWeek = async () => {
    await resetThisWeek();
    toast.success("Fresh week — all weekly tasks uncheckered");
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Weekly reset" accent="calm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Start your week fresh — uncheck all weekly cleaning tasks across every zone.
          </p>
          <Button onClick={onResetWeek} variant="outline" className="rounded-full">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset this week
          </Button>
        </div>
      </SectionCard>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a new zone (e.g. Garage)"
          value={newZone}
          onChange={(e) => setNewZone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newZone.trim()) {
              addCleaning({ title: "First task", zone: newZone.trim(), cadence: "weekly" });
              setNewZone("");
            }
          }}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">Press enter to seed a starter task</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zones.map((z) => {
          const list = byZone[z] ?? [];
          const total = list.length;
          const done = list.filter((c) => c.done).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={z} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold">{z}</h3>
                </div>
                <span className="text-xs text-muted-foreground">{done}/{total}</span>
              </div>
              <Progress value={pct} className="h-1.5" />

              <ul className="flex flex-col gap-1">
                {list.length === 0 && (
                  <li className="rounded-xl border border-dashed border-border/50 p-2 text-center text-xs text-muted-foreground">
                    No tasks here yet
                  </li>
                )}
                {list.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2.5 py-1.5 text-sm",
                      c.done && "opacity-60",
                    )}
                  >
                    <Checkbox checked={!!c.done} onCheckedChange={() => toggleCleaning(c.id)} />
                    <span className={cn("flex-1 truncate", c.done && "line-through")}>{c.title}</span>
                    <button
                      onClick={() => deleteCleaning(c.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-1.5">
                <Input
                  value={drafts[z] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [z]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && onAdd(z)}
                  placeholder="Add task…"
                  className="h-8 text-xs"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onAdd(z)} aria-label="Add">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}