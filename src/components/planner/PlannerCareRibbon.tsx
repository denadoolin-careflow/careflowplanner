/**
 * Compact, pinned ribbon above the day timeline: today's habits and medicine
 * doses as one-tap chips. Check-offs write to the same habit logs and dose
 * logs used everywhere else, so Bedside care and the habit garden stay in sync.
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, ChevronDown, Pill, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { habitCountsOn } from "./PlannerRhythmRow";
import { useMedications, useMedicationLogs, doseSlots } from "@/lib/medications";
import { haptics } from "@/lib/haptics";

const KEY = "careflow:planner:care-ribbon-open";

export function PlannerCareRibbon({ date, className }: { date: Date; className?: string }) {
  const { state, toggleHabit } = useStore() as any;
  const iso = format(date, "yyyy-MM-dd");
  const { medications } = useMedications();
  const { statusOf, setStatus } = useMedicationLogs(iso);
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
  });
  const toggleOpen = () => setOpen(o => { try { localStorage.setItem(KEY, o ? "0" : "1"); } catch {} return !o; });

  const habits = useMemo(() => (state.habits ?? []).filter((h: any) => habitCountsOn(h, date)), [state.habits, date]);
  const doses = useMemo(() => doseSlots(medications), [medications]);

  const chips = [
    ...doses.map(s => ({
      key: `m-${s.med.id}-${s.time}`, kind: "med" as const, label: `${s.med.name} · ${s.time}`,
      done: statusOf(s.med.id, s.time) === "taken",
      toggle: (d: boolean) => setStatus(s.med.id, s.time, d ? null : "taken"),
    })),
    ...habits.map((h: any) => ({
      key: `h-${h.id}`, kind: "habit" as const, label: h.title, done: !!h.log?.[iso],
      toggle: () => toggleHabit(h.id, iso),
    })),
  ];
  if (!chips.length) return null;
  const doneCount = chips.filter(c => c.done).length;

  return (
    <section aria-label="Habits and medicines" className={cn("rounded-xl border border-border/60 bg-card/70 px-2 py-1.5", className)}>
      <button type="button" onClick={toggleOpen} aria-expanded={open}
        className="flex w-full items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <Sprout className="h-3.5 w-3.5 text-secondary" aria-hidden />
        <span>Habits & meds</span>
        <span className="font-mono">{doneCount}/{chips.length}</span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} aria-hidden />
      </button>
      {open && (
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {chips.map(c => (
            <button key={c.key} type="button" aria-pressed={c.done}
              onClick={() => { haptics.snap?.(); void c.toggle(c.done); }}
              className={cn(
                "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors",
                c.done ? "border-primary/50 bg-primary/10 text-foreground" : "border-border/70 bg-background/70 text-foreground hover:border-primary/40",
              )}>
              <span className={cn("grid h-4 w-4 place-items-center rounded-full border", c.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                {c.done ? <Check className="h-2.5 w-2.5" /> : c.kind === "med" ? <Pill className="h-2.5 w-2.5 text-muted-foreground" /> : null}
              </span>
              <span className={cn("max-w-[11rem] truncate", c.done && "text-muted-foreground line-through")}>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
