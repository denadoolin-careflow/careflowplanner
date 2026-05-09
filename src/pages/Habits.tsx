import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Trash2 } from "lucide-react";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATS: Habit["category"][] = ["self-care","home","family","caregiving","health","creative","spiritual"];

export default function Habits() {
  const { state, addHabit, toggleHabit, deleteHabit } = useStore();
  const [title, setTitle] = useState(""); const [cat, setCat] = useState<Habit["category"]>("self-care");
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-calm p-6">
        <h2 className="font-display text-3xl font-semibold">Gentle habits</h2>
        <p className="mt-1 text-sm text-muted-foreground">Streaks here are kind. Missing a day doesn't erase you.</p>
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

      <SectionCard title="This week" subtitle="Tap a day to log it." accent="warm">
        <div className="space-y-2">
          {state.habits.map(h => (
            <div key={h.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{h.title}</div>
                <div className="text-xs text-muted-foreground capitalize">{h.cadence} · {h.category}</div>
              </div>
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
              <Button variant="ghost" size="icon" onClick={() => deleteHabit(h.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Weekly habit review" accent="sage">
        <p className="text-sm text-muted-foreground">{state.habits.filter(h => h.log[todayISO()]).length} of {state.habits.length} done today. That's enough.</p>
      </SectionCard>
    </div>
  );
}
