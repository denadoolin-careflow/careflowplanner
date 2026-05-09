import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, parseISO, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Month() {
  const { state, addJournal } = useStore();
  const [cursor] = useState(new Date());
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });
  const [reflection, setReflection] = useState("");

  const eventsOn = (d: Date) => {
    const k = d.toISOString().slice(0,10);
    return [
      ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, label: a.title })),
      ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, label: `🎂 ${b.name}` })),
      ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, label: `✨ ${h.name}` })),
    ];
  };

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Month of</p>
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{format(cursor, "MMMM yyyy")}</h2>
      </div>

      <SectionCard title="Calendar" accent="calm">
        <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map(d => {
            const inMonth = isSameMonth(d, cursor);
            const today = isSameDay(d, new Date());
            const ev = eventsOn(d);
            return (
              <div key={d.toISOString()} className={cn(
                "min-h-20 rounded-lg border p-1.5 text-xs transition-colors",
                inMonth ? "border-border/60 bg-card" : "border-transparent bg-transparent text-muted-foreground/50",
                today && "ring-2 ring-primary"
              )}>
                <div className={cn("text-right text-[11px] font-medium", today && "text-primary")}>{format(d, "d")}</div>
                <div className="mt-0.5 space-y-0.5">
                  {ev.slice(0,2).map((e, i) => (
                    <div key={i} className={cn("truncate rounded px-1 py-0.5 text-[10px]",
                      e.kind === "appt" && "bg-primary-soft text-foreground",
                      e.kind === "bday" && "bg-accent-soft text-accent-foreground",
                      e.kind === "hol" && "bg-secondary-soft text-secondary-foreground"
                    )}>{e.label}</div>
                  ))}
                  {ev.length > 2 && <div className="text-[10px] text-muted-foreground">+{ev.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="Monthly goals" accent="calm">
          <ul className="space-y-1.5 text-sm">{state.goals.filter(g => g.status === "active").slice(0, 5).map(g => <li key={g.id} className="rounded-lg bg-muted/40 px-3 py-2">{g.title} — <span className="text-muted-foreground">{g.progress}%</span></li>)}</ul>
        </SectionCard>
        <SectionCard title="Bills, appointments, birthdays" accent="warm">
          <ul className="space-y-1.5 text-sm">
            {[...state.appointments.slice(0,3).map(a => `📅 ${a.title} — ${format(parseISO(a.date), "MMM d")}`),
              ...state.birthdays.slice(0,3).map(b => `🎂 ${b.name} — ${format(parseISO(b.date), "MMM d")}`),
              ...state.holidays.slice(0,3).map(h => `✨ ${h.name} — ${format(parseISO(h.date), "MMM d")}`)].map((s, i) => (
              <li key={i} className="rounded-lg bg-muted/40 px-3 py-2">{s}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Cleaning rotation" accent="sage">
          <ul className="space-y-1.5 text-sm">{state.cleaning.filter(c => c.cadence === "monthly").map(c => <li key={c.id} className="rounded-lg bg-muted/40 px-3 py-2">{c.title} <span className="text-xs text-muted-foreground">· {c.zone}</span></li>)}</ul>
        </SectionCard>
        <SectionCard title="Meal themes" accent="warm">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="rounded-lg bg-muted/40 px-3 py-2 text-foreground">Mondays — sheet pan</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2 text-foreground">Tuesdays — taco / wrap</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2 text-foreground">Wednesdays — pasta</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2 text-foreground">Thursdays — leftovers / soup</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2 text-foreground">Fridays — breakfast for dinner</li>
          </ul>
        </SectionCard>
        <SectionCard title="Idea review" accent="warm">
          <ul className="space-y-1 text-sm">{state.ideas.slice(0,5).map(i => <li key={i.id} className="rounded-lg bg-muted/40 px-3 py-2">{i.title}</li>)}</ul>
        </SectionCard>
        <SectionCard title="Monthly reflection" accent="calm">
          <Textarea rows={4} placeholder="Looking back on the month…" value={reflection} onChange={e => setReflection(e.target.value)} />
          <Button className="mt-3" onClick={() => { if (!reflection.trim()) return; addJournal({ body: reflection, type: "monthly", title: format(cursor, "MMMM") }); setReflection(""); toast.success("Saved."); }}>Save</Button>
        </SectionCard>
      </div>
    </div>
  );
}
