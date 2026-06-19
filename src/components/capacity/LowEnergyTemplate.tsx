import { useState } from "react";
import { Plus, Heart, Coffee, Droplet, Wind, Soup, Bed, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, todayISO } from "@/lib/store";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

type Template = {
  id: string;
  title: string;
  icon: typeof Heart;
  area: Task["area"];
  energy: Task["energy"];
  estMinutes?: number;
  notes?: string;
};

const MVD_TEMPLATES: Template[] = [
  { id: "water",     title: "Drink a glass of water",                 icon: Droplet, area: "Personal", energy: "low", estMinutes: 2 },
  { id: "breathe",   title: "Take 5 slow breaths",                    icon: Wind,    area: "Personal", energy: "low", estMinutes: 3 },
  { id: "fuel",      title: "Eat something nourishing",               icon: Soup,    area: "Meals",    energy: "low", estMinutes: 15 },
  { id: "meds",      title: "Take meds / vitamins",                   icon: Heart,   area: "Personal", energy: "low", estMinutes: 2 },
  { id: "rest",      title: "Rest for 20 minutes — no guilt",         icon: Bed,     area: "Personal", energy: "low", estMinutes: 20 },
  { id: "warmth",    title: "Make a warm drink",                      icon: Coffee,  area: "Personal", energy: "low", estMinutes: 5 },
  { id: "ask",       title: "Ask for one thing you need today",       icon: Heart,   area: "Family",   energy: "low", estMinutes: 5 },
  { id: "tidy",      title: "Tidy one surface (2 min only)",          icon: Check,   area: "Home",     energy: "low", estMinutes: 2 },
];

export function LowEnergyTemplate({ onAdded }: { onAdded?: () => void }) {
  const { addTask } = useStore();
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);
  const iso = todayISO();

  const addOne = async (t: Template) => {
    setAdding(t.id);
    try {
      await addTask({
        title: t.title,
        area: t.area,
        energy: t.energy,
        priority: "low",
        estMinutes: t.estMinutes,
        dueDate: iso,
        notes: "Added from Low-energy mode — minimum viable day.",
      });
      setAddedIds(prev => new Set(prev).add(t.id));
      toast.success(`Added: ${t.title}`);
      onAdded?.();
    } catch {
      toast.error("Couldn't add task");
    } finally {
      setAdding(null);
    }
  };

  const addAllCore = async () => {
    setBulkAdding(true);
    const core = MVD_TEMPLATES.filter(t => ["water", "breathe", "fuel", "meds", "rest"].includes(t.id));
    for (const t of core) {
      if (addedIds.has(t.id)) continue;
      // eslint-disable-next-line no-await-in-loop
      await addTask({
        title: t.title,
        area: t.area,
        energy: t.energy,
        priority: "low",
        estMinutes: t.estMinutes,
        dueDate: iso,
        notes: "Added from Low-energy mode — minimum viable day.",
      });
    }
    setAddedIds(prev => {
      const next = new Set(prev);
      core.forEach(t => next.add(t.id));
      return next;
    });
    toast.success("Minimum viable day added to today");
    setBulkAdding(false);
    onAdded?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Low-energy mode
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
            A minimum viable day — one tap per action.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={addAllCore}
          disabled={bulkAdding}
          className="h-7 px-2 text-[11px]"
        >
          {bulkAdding ? "Adding…" : "Add core 5"}
        </Button>
      </div>

      <ul className="grid gap-1.5">
        {MVD_TEMPLATES.map(t => {
          const Icon = t.icon;
          const added = addedIds.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => addOne(t)}
                disabled={adding === t.id || added}
                className="flex w-full items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-left text-[12px] transition hover:bg-muted/60 disabled:opacity-60"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate">{t.title}</span>
                {added ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}