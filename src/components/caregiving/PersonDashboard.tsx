import { useMemo } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Heart, Leaf, Utensils, Brain, Compass, CalendarClock, Moon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { useRoutines, routines as routinesStore } from "@/lib/routines";
import { phaseForDate } from "@/lib/cycle";
import { useAIPersonOverview } from "@/hooks/useAIPersonOverview";
import type { CareRecipient } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

function ageFrom(birth?: string): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export function PersonDashboard({ recipient }: { recipient: CareRecipient }) {
  const { state } = useStore();
  const { periods, settings } = useCycle();
  useRoutines(); // subscribe so byPerson cache stays fresh

  const cyclePhase = useMemo(() => {
    if (recipient.kind === "pet") return null;
    try { return phaseForDate(new Date(), periods, settings); } catch { return null; }
  }, [recipient.kind, periods, settings]);

  const routineTitles = useMemo(
    () =>
      (recipient.id
        ? routinesStore.byRecipient(recipient.id)
        : routinesStore.byPerson(recipient.name)
      ).map(r => `${r.title} (${r.slot ?? "any"})`),
    [recipient.id, recipient.name]
  );
  const habitTitles = useMemo(
    () => state.habits.map(h => h.title),
    [state.habits]
  );

  const { payload, generatedAt, loading, generating, regenerate, error } =
    useAIPersonOverview(recipient, { cyclePhase: cyclePhase ?? null, routineTitles, habitTitles });

  const age = ageFrom(recipient.birthDate);
  const stamp = generatedAt ? formatDistanceToNow(new Date(generatedAt), { addSuffix: true }) : null;

  return (
    <div className="space-y-5">
      <div className="cozy-card gradient-calm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Developmental dashboard</div>
            <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{recipient.name}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{recipient.kind}</span>
              {age != null && <span className="rounded-full bg-muted px-2 py-0.5">{age} y</span>}
              {recipient.zodiac && <span className="rounded-full bg-muted px-2 py-0.5">{recipient.zodiac}</span>}
              {cyclePhase && <span className="rounded-full bg-muted px-2 py-0.5">cycle: {cyclePhase}</span>}
              {recipient.educationLevel && <span className="rounded-full bg-muted px-2 py-0.5">{recipient.educationLevel}</span>}
            </div>
          </div>
          <Button onClick={regenerate} disabled={generating} className="rounded-full">
            {generating ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {payload ? "Refresh" : "Generate"}
          </Button>
        </div>
        {stamp && <p className="mt-3 text-[11px] text-muted-foreground">Last generated {stamp}</p>}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : !payload ? (
        <SectionCard title="Tap Generate" subtitle="Create an AI-curated developmental plan" accent="calm">
          <p className="text-sm text-muted-foreground">
            Lovable will weave together {recipient.name}'s age, profile, diagnosis notes, zodiac, cycle, schedule,
            current routines and habits into a holistic plan tailored to support what's growing and what's lacking.
          </p>
        </SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {payload.snapshot && (
            <SectionCard title="Snapshot" accent="calm" className="lg:col-span-2">
              <p className="text-sm leading-relaxed">{payload.snapshot}</p>
              {(payload.zodiacNote || payload.cycle) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {payload.zodiacNote && (
                    <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                      <Compass className="mr-1 inline h-3.5 w-3.5" /> {payload.zodiacNote}
                    </div>
                  )}
                  {payload.cycle && (
                    <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                      <Moon className="mr-1 inline h-3.5 w-3.5" /> {payload.cycle}
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          )}

          {payload.devPlan && payload.devPlan.length > 0 && (
            <SectionCard title="Developmental plan" subtitle="What to nurture next" accent="sage">
              <ul className="space-y-3">
                {payload.devPlan.map((it, i) => (
                  <li key={i} className="rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><Brain className="h-3.5 w-3.5 text-secondary-foreground" /> {it.area}</div>
                    <p className="mt-1 text-sm">{it.focus}</p>
                    {it.why && <p className="mt-1 text-xs text-muted-foreground">{it.why}</p>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {payload.foods && payload.foods.length > 0 && (
            <SectionCard title="Foods that help" accent="warm">
              <ul className="space-y-2">
                {payload.foods.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                    <Utensils className="mt-0.5 h-3.5 w-3.5 text-accent" />
                    <div><span className="font-medium">{it.title}</span>{it.why && <span className="block text-xs text-muted-foreground">{it.why}</span>}</div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {payload.habits && payload.habits.length > 0 && (
            <SectionCard title="Supportive habits" accent="sage">
              <ul className="space-y-2">
                {payload.habits.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                    <Leaf className="mt-0.5 h-3.5 w-3.5 text-secondary-foreground" />
                    <div><span className="font-medium">{it.title}</span>{it.why && <span className="block text-xs text-muted-foreground">{it.why}</span>}</div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {payload.carePlan && payload.carePlan.length > 0 && (
            <SectionCard title="Care plan" subtitle="Grounded in their context" accent="warm">
              <ul className="space-y-2">
                {payload.carePlan.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                    <Heart className="mt-0.5 h-3.5 w-3.5 text-accent" />
                    <div><span className="font-medium">{it.title}</span>{it.detail && <span className="block text-xs text-muted-foreground">{it.detail}</span>}</div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {payload.routines && payload.routines.length > 0 && (
            <SectionCard title="Routine ideas" accent="calm">
              <ul className="space-y-2">
                {payload.routines.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                    <CalendarClock className="mt-0.5 h-3.5 w-3.5 text-primary" />
                    <div>
                      <span className="font-medium">{it.title}</span>
                      {it.when && <span className="ml-1 text-xs text-muted-foreground">· {it.when}</span>}
                      {it.why && <span className="block text-xs text-muted-foreground">{it.why}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {payload.activities && payload.activities.length > 0 && (
            <SectionCard title="Activities & enrichment" accent="warm" className="lg:col-span-2">
              <ul className="grid gap-2 sm:grid-cols-2">
                {payload.activities.map((it, i) => (
                  <li key={i} className="rounded-xl bg-muted/40 p-3 text-sm">
                    <span className="font-medium">{it.title}</span>
                    {it.why && <p className="mt-0.5 text-xs text-muted-foreground">{it.why}</p>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}