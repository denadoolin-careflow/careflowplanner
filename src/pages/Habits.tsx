import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Trash2, ChevronDown, Leaf, ListChecks } from "lucide-react";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { HabitGarden } from "@/components/habits/HabitGarden";
import { HabitDetailSheet } from "@/components/habits/HabitDetailSheet";
import { HabitWeeklyAnalytics } from "@/components/habits/HabitWeeklyAnalytics";

const CATS: Habit["category"][] = ["self-care","home","family","caregiving","health","creative","spiritual"];

export default function Habits() {
  const { state, addHabit, toggleHabit, deleteHabit } = useStore();
  const [title, setTitle] = useState(""); const [cat, setCat] = useState<Habit["category"]>("self-care");
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [view, setView] = useState<"garden" | "list">("garden");
  const [openHabitId, setOpenHabitId] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-calm p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-semibold">Gentle habits</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tend each plant. Streaks here are kind — missing a day doesn't erase you.</p>
          </div>
          <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-0.5">
            <button
              onClick={() => setView("garden")}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs transition",
                view === "garden" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Leaf className="h-3 w-3" /> Garden
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs transition",
                view === "list" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListChecks className="h-3 w-3" /> List
            </button>
          </div>
        </div>
      </div>

      <SectionCard title="Add a habit" accent="calm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="A tiny, doable habit" value={title} onChange={e => setTitle(e.target.value)} />
          <Select value={cat} onValueChange={(v: any) => setCat(v)}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { if (!title.trim()) return; addHabit({ title, category: cat }); setTitle(""); }}>Add</Button>
        </div>
      </SectionCard>

      {view === "garden" ? (
        <HabitGarden onOpen={setOpenHabitId} />
      ) : (
      <SectionCard title="This week" subtitle="Tap a day to log it." accent="warm">
        <div className="space-y-2">
          {state.habits.map(h => (
            <div key={h.id} className="rounded-xl border border-border/60 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenHabitId(h.id)}>
                  <div className="font-medium">{h.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{h.cadence} · {h.category}</div>
                </button>
                <div className="flex items-center gap-1">
                  {days.map(d => {
                    const k = d.toISOString().slice(0,10);
                    const done = !!h.log[k];
                    return (
                      <button key={k} onClick={() => toggleHabit(h.id, k)}
                        className={cn("flex h-9 w-9 flex-col items-center justify-center rounded-lg text-[10px] transition-all",
                          done ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
                        <span className="text-[9px] uppercase">{format(d, "EEE")[0]}</span>
                        <span className="text-[10px] font-bold">{format(d, "d")}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="h-3 w-3" />{h.streak}</div>
                <Button variant="ghost" size="icon" onClick={() => setOpenNotes(openNotes === h.id ? null : h.id)} aria-label="Toggle notes">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", openNotes === h.id && "rotate-180")} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteHabit(h.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {openNotes === h.id && (
                <div className="mt-3">
                  <LinkedNotesPanel entityType="habit" entityId={h.id} contextTitle={h.title} compact />
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
      )}

      <SectionCard title="Weekly habit review" subtitle="Patterns, plant stages, and a gentle AI read." accent="sage">
        <HabitWeeklyAnalytics />
      </SectionCard>

      <HabitDetailSheet habitId={openHabitId} open={!!openHabitId} onOpenChange={(o) => !o && setOpenHabitId(null)} />
    </div>
  );
}
