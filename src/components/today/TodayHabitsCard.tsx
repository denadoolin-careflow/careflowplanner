import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Check, Flame, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { HabitPlant } from "@/components/habits/HabitPlant";
import { computeHabitGrowth } from "@/lib/habit-consistency";
import { HabitDetailSheet } from "@/components/habits/HabitDetailSheet";
import { format } from "date-fns";
import type { Habit } from "@/lib/types";

const GROUPS: { key: NonNullable<Habit["timesOfDay"]>[number]; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "midday", label: "Midday" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "anytime", label: "Anytime" },
];

export function TodayHabitsCard({ date }: { date: Date }) {
  const { state, toggleHabit } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const iso = format(date, "yyyy-MM-dd");
  const dow = date.getDay();

  const todayHabits = useMemo(() => state.habits.filter(h => {
    if (h.cadence === "daily") return true;
    if (h.cadence === "weekly") {
      if (h.daysOfWeek?.length) return h.daysOfWeek.includes(dow);
      return true; // fallback: surface weekly habits
    }
    // monthly: surface on linked task days; fall through to linked-task scheduled today
    return (h.linkedTaskIds ?? []).some(id => {
      const t = state.tasks.find(x => x.id === id);
      return t?.dueDate === iso;
    });
  }), [state.habits, state.tasks, iso, dow]);

  if (!todayHabits.length) return null;

  const grouped: Record<string, Habit[]> = {};
  for (const h of todayHabits) {
    const times = h.timesOfDay?.length ? h.timesOfDay : ["anytime"];
    for (const t of times) {
      (grouped[t] ??= []).push(h);
    }
  }

  const total = todayHabits.length;
  const done = todayHabits.filter(h => h.log[iso]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <SectionCard
        title={<span className="inline-flex items-center gap-2"><Sprout className="h-4 w-4 text-primary" /> Today's habits</span>}
        subtitle={`${done} of ${total} tended`}
        accent="sage"
      >
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-3">
          {GROUPS.filter(g => grouped[g.key]?.length).map(g => (
            <div key={g.key}>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{g.label}</div>
              <ul className="space-y-1">
                {grouped[g.key].map(h => {
                  const tended = !!h.log[iso];
                  const growth = computeHabitGrowth(h);
                  const project = (h.linkedProjectIds ?? []).map(id => state.projects.find(p => p.id === id)?.name).filter(Boolean)[0];
                  return (
                    <li key={h.id}
                      className={cn("group flex items-center gap-2 rounded-lg border border-border/50 bg-card/40 p-2 transition",
                        tended && "border-primary/40 bg-primary/5")}>
                      <button type="button" onClick={() => setOpenId(h.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <HabitPlant stage={growth.stage} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{h.title}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" />{growth.forgivingStreak}d</span>
                            {project && <><span>·</span><span className="truncate">{project}</span></>}
                          </div>
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant={tended ? "secondary" : "default"}
                        className="h-7 rounded-full px-2 text-[11px]"
                        onClick={async () => { await toggleHabit(h.id, iso); if (!tended) haptics.success(); else haptics.tap(); }}
                      >
                        {tended ? <Check className="h-3 w-3" /> : "Tend"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
      <HabitDetailSheet habitId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </>
  );
}