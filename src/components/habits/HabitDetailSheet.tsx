import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Flame, Check, Calendar, CalendarDays, CalendarRange, Sparkles, Home, Users, Heart, Activity, Palette, Moon } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { HabitPlant } from "./HabitPlant";
import { computeHabitGrowth, STAGE_LABEL, STAGE_AFFIRMATION } from "@/lib/habit-consistency";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useRoutines, SLOT_LABEL } from "@/lib/routines";
import { useNavigate } from "react-router-dom";

const TIMES: Habit["timesOfDay"] = ["morning","midday","afternoon","evening","anytime"];
const TIME_LABEL: Record<string,string> = { morning:"Morning", midday:"Midday", afternoon:"Afternoon", evening:"Evening", anytime:"Anytime" };
const DOW = ["S","M","T","W","T","F","S"];
const CATS: Habit["category"][] = ["self-care","home","family","caregiving","health","creative","spiritual"];

export function HabitDetailSheet({ habitId, open, onOpenChange }: { habitId: string | null; open: boolean; onOpenChange: (o: boolean) => void; }) {
  const { state, updateHabit, deleteHabit, toggleHabit } = useStore();
  const { routines } = useRoutines();
  const navigate = useNavigate();
  const habit = habitId ? state.habits.find(h => h.id === habitId) ?? null : null;
  const [title, setTitle] = useState(habit?.title ?? "");

  useEffect(() => { setTitle(habit?.title ?? ""); }, [habit?.id]);

  if (!habit) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;

  const today = todayISO();
  const growth = computeHabitGrowth(habit);
  const tendedToday = !!habit.log[today];
  const times = habit.timesOfDay ?? [];
  const days = habit.daysOfWeek ?? [];
  const linkedProjects = habit.linkedProjectIds ?? [];
  const linkedRoutines = habit.linkedRoutineIds ?? [];
  const linkedTasks = habit.linkedTaskIds ?? [];
  const linkedGoals = habit.linkedGoalIds ?? [];

  const toggleTime = (t: string) => {
    const next = times.includes(t as any) ? times.filter(x => x !== t) : [...times, t as any];
    updateHabit(habit.id, { timesOfDay: next as any });
  };
  const toggleDow = (i: number) => {
    const next = days.includes(i) ? days.filter(x => x !== i) : [...days, i].sort();
    updateHabit(habit.id, { daysOfWeek: next });
  };
  const toggleLink = (key: "linkedProjectIds"|"linkedRoutineIds"|"linkedTaskIds"|"linkedGoalIds", id: string) => {
    const cur = (habit[key] ?? []) as string[];
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    updateHabit(habit.id, { [key]: next } as any);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gradient-to-b from-transparent to-muted/40 p-2">
              <HabitPlant stage={growth.stage} size={72} />
            </div>
            <div className="min-w-0 flex-1">
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => { if (title.trim() && title !== habit.title) updateHabit(habit.id, { title: title.trim() }); }}
                className="border-0 px-0 font-display text-xl font-semibold shadow-none focus-visible:ring-0"
              />
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />{growth.forgivingStreak}d streak</span>
                <span>·</span><span>{STAGE_LABEL[growth.stage]}</span>
                <span>·</span><span>{growth.doneDays}/{growth.windowDays} last 14d</span>
              </div>
              <p className="mt-1 text-xs italic text-muted-foreground/80">{STAGE_AFFIRMATION[growth.stage]}</p>
            </div>
          </div>
          <SheetTitle className="sr-only">Habit details</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={tendedToday ? "secondary" : "default"}
              onClick={async () => { await toggleHabit(habit.id, today); if (!tendedToday) haptics.success(); else haptics.tap(); }}
              className="rounded-full"
            >
              {tendedToday ? <><Check className="mr-1 h-3 w-3" /> Tended today</> : "Tend today"}
            </Button>
            <Select value={habit.cadence} onValueChange={(v: any) => updateHabit(habit.id, { cadence: v })}>
              <SelectTrigger className="h-8 w-32 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily" icon={<Calendar className="h-4 w-4 text-muted-foreground" />}>Daily</SelectItem>
                <SelectItem value="weekly" icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}>Weekly</SelectItem>
                <SelectItem value="monthly" icon={<CalendarRange className="h-4 w-4 text-muted-foreground" />}>Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={habit.category} onValueChange={(v: any) => updateHabit(habit.id, { category: v })}>
              <SelectTrigger className="h-8 w-40 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map(c => {
                const CatIcon = c === "self-care" ? Sparkles : c === "home" ? Home : c === "family" ? Users : c === "caregiving" ? Heart : c === "health" ? Activity : c === "creative" ? Palette : Moon;
                return <SelectItem key={c} value={c} icon={<CatIcon className="h-4 w-4 text-muted-foreground" />}>{c}</SelectItem>;
              })}</SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => { deleteHabit(habit.id); onOpenChange(false); }}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>

          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Time of day</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIMES!.map(t => (
                <button key={t} type="button" onClick={() => toggleTime(t!)}
                  className={cn("rounded-full border px-3 py-1 text-xs transition",
                    times.includes(t!) ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-muted/40 hover:bg-muted")}>
                  {TIME_LABEL[t!]}
                </button>
              ))}
            </div>
          </section>

          {habit.cadence === "weekly" && (
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Days of week</Label>
              <div className="flex gap-1.5">
                {DOW.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDow(i)}
                    className={cn("h-9 w-9 rounded-full border text-xs font-medium transition",
                      days.includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-muted/40 hover:bg-muted")}>
                    {d}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <Label htmlFor="reminderTime" className="text-xs uppercase tracking-wide text-muted-foreground">Reminder time</Label>
            <Input id="reminderTime" type="time" value={habit.reminderTime ?? ""}
              onChange={e => updateHabit(habit.id, { reminderTime: e.target.value || undefined })}
              className="w-36" />
          </section>

          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Linked projects</Label>
            <div className="flex flex-wrap gap-1.5">
              {state.projects.length === 0 && <span className="text-xs text-muted-foreground">No projects yet.</span>}
              {state.projects.map(p => {
                const on = linkedProjects.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggleLink("linkedProjectIds", p.id)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-muted/50")}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Linked routines</Label>
            <div className="flex flex-wrap gap-1.5">
              {routines.length === 0 && <span className="text-xs text-muted-foreground">No routines yet.</span>}
              {routines.map(r => {
                const on = linkedRoutines.includes(r.id);
                return (
                  <button key={r.id} type="button" onClick={() => toggleLink("linkedRoutineIds", r.id)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-muted/50")}>
                    {r.person_name} · {SLOT_LABEL[r.slot]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Linked goals</Label>
            <div className="flex flex-wrap gap-1.5">
              {state.goals.length === 0 && <span className="text-xs text-muted-foreground">No goals yet.</span>}
              {state.goals.map(g => {
                const on = linkedGoals.includes(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => toggleLink("linkedGoalIds", g.id)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-muted/50")}>
                    {g.title}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Linked tasks</Label>
            <div className="flex flex-wrap gap-1.5">
              {linkedTasks.length === 0 && <span className="text-xs text-muted-foreground">Open a task and link from here, or pick below.</span>}
              {linkedTasks.map(id => {
                const t = state.tasks.find(x => x.id === id);
                if (!t) return null;
                return (
                  <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => toggleLink("linkedTaskIds", id)}>
                    {t.title} ✕
                  </Badge>
                );
              })}
            </div>
            <details className="rounded-lg border border-border/60 bg-muted/30 p-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">Add tasks…</summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.tasks.filter(t => !t.parentTaskId && !linkedTasks.includes(t.id)).slice(0, 50).map(t => (
                  <button key={t.id} type="button" onClick={() => toggleLink("linkedTaskIds", t.id)}
                    className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] hover:bg-background">
                    + {t.title}
                  </button>
                ))}
              </div>
            </details>
          </section>

          <section>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
            <LinkedNotesPanel entityType="habit" entityId={habit.id} contextTitle={habit.title} compact />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}