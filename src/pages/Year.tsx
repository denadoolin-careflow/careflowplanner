import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";

export default function Year() {
  const { state } = useStore();
  const months = Array.from({ length: 12 }, (_, i) => new Date(new Date().getFullYear(), i, 1));
  const quarters = [["Q1", [0,1,2]], ["Q2", [3,4,5]], ["Q3", [6,7,8]], ["Q4", [9,10,11]]] as const;
  const habitsAvg = state.habits.length ? Math.round(state.habits.reduce((s, h) => s + Math.min(100, h.streak * 5), 0) / state.habits.length) : 0;
  const goalsAvg = state.goals.length ? Math.round(state.goals.reduce((s, g) => s + g.progress, 0) / state.goals.length) : 0;

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-dawn p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Year</p>
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{new Date().getFullYear()}</h2>
        <p className="mt-1 text-sm text-muted-foreground">A long, gentle horizon.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map(m => (
          <div key={m.toISOString()} className="cozy-card p-4">
            <div className="font-display text-lg font-semibold">{format(m, "MMMM")}</div>
            <div className="text-xs text-muted-foreground">
              {state.appointments.filter(a => parseISO(a.date).getMonth() === m.getMonth()).length} appts ·{" "}
              {state.birthdays.filter(b => parseISO(b.date).getMonth() === m.getMonth()).length} birthdays
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="Goals by quarter" accent="calm">
          <div className="space-y-3">
            {quarters.map(([q]) => (
              <div key={q}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{q}</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {state.goals.filter(g => g.timeline === q).map(g => <li key={g.id} className="rounded-lg bg-muted/40 px-3 py-1.5">{g.title}</li>)}
                  {state.goals.filter(g => g.timeline === q).length === 0 && <li className="px-3 py-1.5 text-xs text-muted-foreground">— open —</li>}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Big family events" accent="warm">
          <ul className="space-y-1.5 text-sm">
            {[...state.birthdays.map(b => `🎂 ${b.name} · ${format(parseISO(b.date), "MMM d")}`),
              ...state.holidays.map(h => `✨ ${h.name} · ${format(parseISO(h.date), "MMM d")}`)]
              .slice(0, 8).map((s, i) => <li key={i} className="rounded-lg bg-muted/40 px-3 py-2">{s}</li>)}
          </ul>
        </SectionCard>

        <SectionCard title="Seasonal resets" accent="sage">
          <ul className="space-y-1.5 text-sm">
            <li className="rounded-lg bg-muted/40 px-3 py-2">Spring: closet swap, deep clean kitchen, donate outgrown</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2">Summer: sunscreen + water-bottle station, slower mornings</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2">Fall: school routines, soups in rotation, calendar refresh</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2">Winter: cozy corners, holiday box, low-energy menus</li>
          </ul>
        </SectionCard>

        <SectionCard title="Progress summary" accent="calm">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Goals</span><span className="text-muted-foreground">{goalsAvg}%</span></div>
              <Progress value={goalsAvg} className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Habits</span><span className="text-muted-foreground">{habitsAvg}%</span></div>
              <Progress value={habitsAvg} className="h-2" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Yearly reflection prompts" accent="warm" className="md:col-span-2">
          <ul className="space-y-1.5 font-display text-base">
            <li>What did this year teach me about being a caregiver?</li>
            <li>What did I outgrow?</li>
            <li>What systems actually held me when I was tired?</li>
            <li>Who do I want more of next year?</li>
            <li>What do I want to protect?</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
