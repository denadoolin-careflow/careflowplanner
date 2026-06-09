import { useState } from "react";
import { format } from "date-fns";
import { Plus, Sunrise, Sun, Moon, ListChecks, UtensilsCrossed, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Slot = "auto" | "morning" | "afternoon" | "evening";
type Kind = "task" | "meal";

function currentSlot(d = new Date()): Exclude<Slot, "auto"> {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const SLOT_ICON = { auto: Sparkles, morning: Sunrise, afternoon: Sun, evening: Moon } as const;
const SLOT_TO_DAYPART = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;
const SLOT_TO_MEAL = { morning: "Breakfast", afternoon: "Lunch", evening: "Dinner" } as const;

/**
 * Inline quick-add: types a task or meal, optionally chooses a slot,
 * and we auto-route it into the right time-of-day section.
 */
export function QuickAddBar({ date }: { date: Date }) {
  const { addTask, addMeal } = useStore();
  const [kind, setKind] = useState<Kind>("task");
  const [slot, setSlot] = useState<Slot>("auto");
  const [text, setText] = useState("");

  const iso = format(date, "yyyy-MM-dd");
  const resolvedSlot = slot === "auto" ? currentSlot() : slot;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (kind === "task") {
      await addTask({ title: value, dueDate: iso, dayPart: SLOT_TO_DAYPART[resolvedSlot] });
      toast.success(`Added task → ${SLOT_TO_DAYPART[resolvedSlot]}`);
    } else {
      await addMeal({ name: value, date: iso, slot: SLOT_TO_MEAL[resolvedSlot] });
      toast.success(`Added ${SLOT_TO_MEAL[resolvedSlot]} → ${value}`);
    }
    setText("");
  };

  return (
    <form
      onSubmit={submit}
      className="cozy-card flex flex-wrap items-center gap-1.5 p-2 sm:p-2.5"
    >
      <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/60 p-0.5 text-[11px]">
        {(["task", "meal"] as Kind[]).map(k => {
          const Icon = k === "task" ? ListChecks : UtensilsCrossed;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors",
                kind === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {k === "task" ? "Task" : "Meal"}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1.5">
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={kind === "task" ? "Add a task to today…" : "Add a meal for today…"}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/60 p-0.5 text-[11px]">
        {(["auto", "morning", "afternoon", "evening"] as Slot[]).map(s => {
          const Icon = SLOT_ICON[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              title={s === "auto" ? `Auto · ${SLOT_TO_DAYPART[currentSlot()]}` : s}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 capitalize transition-colors",
                slot === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{s}</span>
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={!text.trim()}
        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-soft transition disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}