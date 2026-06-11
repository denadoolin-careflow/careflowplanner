/**
 * Today, at a glance — energy tracker per day part + scheduled tasks grouped by
 * morning/afternoon/evening, with a quick-add task per part. A "+ Add" dropdown on
 * the header lets you quickly drop a task into any part of today.
 */
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DAY_PARTS, ENERGY_COLOR, ENERGY_LABEL, currentDayPart,
  useDayPartEnergy, type DayPart, type Energy,
} from "@/lib/energy-by-part";
import { Coffee, Plus, Sun, Sunset, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const PART_META: Record<DayPart, { label: string; icon: any }> = {
  morning:   { label: "Morning",   icon: Coffee },
  afternoon: { label: "Afternoon", icon: Sun },
  evening:   { label: "Evening",   icon: Sunset },
};

const ENERGIES: Energy[] = ["low", "medium", "high"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

function EnergyRow({ part, value, onSet }: {
  part: DayPart;
  value: Energy | undefined;
  onSet: (e: Energy) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ENERGIES.map(e => {
        const active = value === e;
        const c = ENERGY_COLOR[e];
        return (
          <button
            key={e}
            type="button"
            onClick={() => onSet(e)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? `${c.bg} ${c.text} ${c.border}`
                : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60",
            )}
            aria-pressed={active}
            aria-label={`${part} energy ${e}`}
          >
            <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle", c.dot)} />
            {ENERGY_LABEL[e]}
          </button>
        );
      })}
    </div>
  );
}

function QuickAddInline({ onAdd, placeholder }: { onAdd: (title: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (!t) return; onAdd(t); setV(""); }}
      className="mt-1.5 flex items-center gap-1.5"
    >
      <Input
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
      <Button type="submit" size="sm" variant="ghost" className="h-8 px-2" disabled={!v.trim()}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

export function TodayAtAGlance() {
  const { state, addTask, toggleTask } = useStore();
  const today = todayISO();
  const [energy, setEnergy] = useDayPartEnergy(today);
  const now = currentDayPart();

  const tasksByPart = useMemo(() => {
    const tasks = (state?.tasks ?? []).filter((t: any) => t.dueDate === today);
    const buckets: Record<DayPart | "unassigned", any[]> = {
      morning: [], afternoon: [], evening: [], unassigned: [],
    };
    for (const t of tasks) {
      const raw = typeof t.dayPart === "string" ? t.dayPart.toLowerCase() : null;
      if (raw === "morning" || raw === "afternoon" || raw === "evening") {
        buckets[raw as DayPart].push(t);
      } else {
        buckets.unassigned.push(t);
      }
    }
    return buckets;
  }, [state, today]);

  const toTaskDayPart = (p: DayPart) =>
    (p.charAt(0).toUpperCase() + p.slice(1)) as "Morning" | "Afternoon" | "Evening";
  const add = (part: DayPart | null, title: string) =>
    addTask({ title, dueDate: today, dayPart: part ? toTaskDayPart(part) : undefined });

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-5">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today</p>
          <h3 className="font-display text-lg font-semibold leading-tight">Today, at a glance</h3>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add to today
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quick add</p>
            {DAY_PARTS.map(p => {
              const Icon = PART_META[p].icon;
              return (
                <div key={p}>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {PART_META[p].label}
                  </div>
                  <QuickAddInline placeholder={`Task for ${PART_META[p].label.toLowerCase()}…`} onAdd={(t) => add(p, t)} />
                </div>
              );
            })}
            <div className="border-t border-border/40 pt-2">
              <div className="text-xs font-medium">Today (no time of day)</div>
              <QuickAddInline placeholder="Task for today…" onAdd={(t) => add(null, t)} />
              <p className="mt-2 text-[10px] text-muted-foreground">
                {tasksByPart.morning.length + tasksByPart.afternoon.length + tasksByPart.evening.length + tasksByPart.unassigned.length}
                {" "}scheduled today
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      <div className="mt-4 space-y-3">
        {DAY_PARTS.map(part => {
          const Icon = PART_META[part].icon;
          const isNow = now === part;
          const list = tasksByPart[part];
          return (
            <div
              key={part}
              className={cn(
                "rounded-xl border border-border/50 bg-background/40 p-3",
                isNow && "ring-1 ring-primary/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-4 w-4 text-primary" />
                  {PART_META[part].label}
                  {isNow && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">Now</span>}
                </div>
              </div>
              <div className="mt-2">
                <EnergyRow part={part} value={energy[part]} onSet={(e) => setEnergy(part, e)} />
              </div>
              {list.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {list.slice(0, 4).map((t: any) => (
                    <li key={t.id} className="flex items-start gap-1.5 text-[12.5px]">
                      <button
                        type="button"
                        onClick={() => toggleTask(t.id)}
                        className="mt-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={t.done ? "Mark not done" : "Mark done"}
                      >
                        {t.done
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : <Circle className="h-3.5 w-3.5" />}
                      </button>
                      <span className={cn(t.done && "text-muted-foreground line-through")}>{t.title}</span>
                    </li>
                  ))}
                  {list.length > 4 && (
                    <li className="text-[11px] text-muted-foreground">+ {list.length - 4} more</li>
                  )}
                </ul>
              )}
              <QuickAddInline placeholder={`Add to ${PART_META[part].label.toLowerCase()}…`} onAdd={(t) => add(part, t)} />
            </div>
          );
        })}

        {tasksByPart.unassigned.length > 0 && (
          <div className="rounded-xl border border-dashed border-border/50 bg-background/30 p-3">
            <div className="text-xs font-medium text-muted-foreground">Today · no time of day</div>
            <ul className="mt-1.5 space-y-1">
              {tasksByPart.unassigned.slice(0, 5).map((t: any) => (
                <li key={t.id} className="flex items-start gap-1.5 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className="mt-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={t.done ? "Mark not done" : "Mark done"}
                  >
                    {t.done
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <Circle className="h-3.5 w-3.5" />}
                  </button>
                  <span className={cn(t.done && "text-muted-foreground line-through")}>{t.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}